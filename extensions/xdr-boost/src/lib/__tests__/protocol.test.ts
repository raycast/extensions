import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_IN_MAX_GAIN } from "../intent";
import { HELPER_PROTOCOL, RUN_PARAMETERS, runArgs } from "../protocol";

const SOURCES = join(__dirname, "../../../swift/Sources/XDRBoostHelper");
const exportsSwift = readFileSync(join(SOURCES, "Exports.swift"), "utf8");
const curveSwift = readFileSync(join(SOURCES, "Curve.swift"), "utf8");

const PACKAGE = join(__dirname, "../../../swift");

/**
 * Every input that builds the helper: every file in the Swift package (manifests of any Swift version, the
 * dependency lock, all sources), skipping dot-named build and editor folders. A symlink fails the test, since
 * the bytes it points at would be outside the hash.
 */
function helperInputs(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink in the Swift package: ${relative(PACKAGE, path)}`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(relative(PACKAGE, path));
    }
  };
  walk(PACKAGE);
  return files.sort();
}

function swiftConstant(source: string, name: string): string {
  const match = new RegExp(`static let ${name} = ([^\\n]+)`).exec(source);
  if (!match) throw new Error(`${name} not found in the Swift source`);
  return match[1].trim();
}

describe("helper protocol", () => {
  it("matches helperProtocol in the Swift helper", () => {
    const match = /let helperProtocol = (\d+)/.exec(exportsSwift);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(HELPER_PROTOCOL);
  });

  // A running helper survives an extension update and is replaced only when its protocol differs. So a change to
  // any safety limit below must come with a protocol bump, or an older helper keeps boosting with the old limits.
  // Changing a limit fails this test until the protocol is bumped and the fingerprint updated together.
  it("pins the safety limits to the protocol version", () => {
    const fingerprint = {
      protocol: HELPER_PROTOCOL,
      encodingGamma: swiftConstant(curveSwift, "encodingGamma"),
      builtInMaxGain: swiftConstant(curveSwift, "builtInMaxGain"),
      headroomShare: swiftConstant(curveSwift, "headroomShare"),
      headroomSafety: swiftConstant(curveSwift, "headroomSafety"),
      profiles: [...curveSwift.matchAll(/Profile\(peak: ([\d.]+), nitsCap: (\w+|[\d.]+)\)/g)].map(
        (m) => `${m[1]}/${m[2]}`,
      ),
    };
    // The exact bytes of every helper build input: any change, a comment included, is a protocol bump, so an
    // older running helper is always replaced by the new one.
    const hash = createHash("sha256");
    // Length-prefixed path and content, so no two file sets encode the same.
    for (const file of helperInputs()) {
      const bytes = readFileSync(join(PACKAGE, file));
      hash.update(`${Buffer.byteLength(file)}:${file}${bytes.length}:`).update(bytes);
    }
    expect({ protocol: HELPER_PROTOCOL, sha256: hash.digest("hex") }).toEqual({
      protocol: 9,
      sha256: "f654a36a4e4459995567ad1407f43f6133fe9473d4eb196a9ad1edf86c8efd57",
    });
    expect(fingerprint).toEqual({
      protocol: 9,
      encodingGamma: "2.2",
      builtInMaxGain: "pow(1.75, encodingGamma)",
      headroomShare: "0.6",
      headroomSafety: "0.95",
      profiles: ["1600/nil", "1600/560", "2000/560", "1600/560"],
    });
  });

  it("BUILT_IN_MAX_GAIN equals Curve.builtInMaxGain", () => {
    expect(swiftConstant(curveSwift, "builtInMaxGain")).toBe("pow(1.75, encodingGamma)");
    expect(BUILT_IN_MAX_GAIN).toBe(Math.pow(1.75, Number(swiftConstant(curveSwift, "encodingGamma"))));
  });
});

describe("run arguments", () => {
  const args = runArgs({ all: 1.5, levels: { A: 1.2 } }, "/tmp/state.json", {
    strategy: "fixed",
    externalMax: 2,
    lowBattery: 20,
  });

  it("follow the Swift run(...) parameter order", () => {
    const signature = /@raycast func run\(([^)]*)\)/.exec(exportsSwift)?.[1] ?? "";
    const names = [...signature.matchAll(/(?:^|,)\s*(\w+):/g)].map((m) => m[1]);
    expect(names).toEqual([...RUN_PARAMETERS]);
    expect(args).toHaveLength(1 + RUN_PARAMETERS.length);
  });

  it("put the state path at argv[3], where PidFile.isHelper reads it", () => {
    expect(exportsSwift).toContain('args[1] == "run"');
    expect(exportsSwift).toContain("args[3].utf8");
    const argv = ["/path/to/bin", ...args];
    expect(argv[1]).toBe("run");
    expect(JSON.parse(argv[3])).toBe("/tmp/state.json");
  });
});
