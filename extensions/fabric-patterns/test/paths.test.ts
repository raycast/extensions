import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_FABRIC_PATH, isRunnableFile, pastedPath, resolveFabricPath } from "../lib/paths";

// A fake home, joined at runtime so no literal home path sits in the repo.
const HOME = join("/", "Users", "someone");
const has =
  (...paths: string[]) =>
  (p: string) =>
    paths.includes(p);

describe("pastedPath (paste-in Preferences paths)", () => {
  test.each([
    [`${HOME}/Notes`, `${HOME}/Notes`],
    [`  ${HOME}/Notes \n`, `${HOME}/Notes`],
    [`'${HOME}/My Notes'`, `${HOME}/My Notes`],
    [`"${HOME}/My Notes"`, `${HOME}/My Notes`],
    ["~/Notes", `${HOME}/Notes`],
    ["~", HOME],
    [`file://${HOME}/My%20Notes/`, `${HOME}/My Notes`],
    [`${HOME}/Notes///`, `${HOME}/Notes`],
    ["/", "/"],
    ["relative/dir", "relative/dir"],
  ])("%p → %p", (raw, want) => {
    expect(pastedPath(raw, HOME)).toBe(want);
  });

  test("empty or blank means unset", () => {
    expect(pastedPath(undefined, HOME)).toBeUndefined();
    expect(pastedPath("   ", HOME)).toBeUndefined();
    expect(pastedPath('""', HOME)).toBeUndefined();
  });

  test.each([
    [`file://localhost${HOME}/x`, `${HOME}/x`],
    ["'~/Notes'", `${HOME}/Notes`],
  ])("%p → %p", (raw, want) => {
    expect(pastedPath(raw, HOME)).toBe(want);
  });

  test("a malformed file:// URL comes back as typed, so it is refused as not absolute rather than silently unset", () => {
    const bad = "file://%E0%A4%A";
    expect(pastedPath(bad, HOME)).toBe(bad);
    expect(pastedPath(bad, HOME)!.startsWith("/")).toBe(false);
  });

  test("~user is not expanded (only the user's own home)", () => {
    expect(pastedPath("~root/x", HOME)).toBe("~root/x");
  });
});

describe("a fabric path that isn't there falls back to its -ai sibling", () => {
  test.each<[string, string, string[], string]>([
    ["configured path exists", "/x/fabric", ["/x/fabric", "/x/fabric-ai"], "/x/fabric"],
    ["fabric missing, fabric-ai there", "/x/fabric", ["/x/fabric-ai"], "/x/fabric-ai"],
    ["fabric-ai missing, fabric there", "/x/fabric-ai", ["/x/fabric"], "/x/fabric"],
    ["neither: the configured path, for the not-found state", "/x/fabric-ai", [], "/x/fabric-ai"],
    ["another name has no sibling", "/x/fabric-dev", ["/x/fabric", "/x/fabric-ai"], "/x/fabric-dev"],
    ["only the file name is swapped", "/fabric/bin/fabric", ["/fabric/bin/fabric-ai"], "/fabric/bin/fabric-ai"],
  ])("%s", (_, configured, exist, want) => {
    expect(resolveFabricPath(configured, has(...exist))).toBe(want);
  });
});

describe("Intel Macs: the default path falls back to /usr/local/bin", () => {
  test.each<[string, string[], string]>([
    ["ISC-53: only /usr/local/bin/fabric-ai", ["/usr/local/bin/fabric-ai"], "/usr/local/bin/fabric-ai"],
    ["ISC-53: only /usr/local/bin/fabric", ["/usr/local/bin/fabric"], "/usr/local/bin/fabric"],
    [
      "fabric-ai wins over fabric there too",
      ["/usr/local/bin/fabric", "/usr/local/bin/fabric-ai"],
      "/usr/local/bin/fabric-ai",
    ],
    [
      "Homebrew's sibling beats /usr/local",
      ["/opt/homebrew/bin/fabric", "/usr/local/bin/fabric-ai"],
      "/opt/homebrew/bin/fabric",
    ],
    ["nowhere: the default, for the not-found state", [], DEFAULT_FABRIC_PATH],
  ])("%s", (_, exist, want) => {
    expect(resolveFabricPath(DEFAULT_FABRIC_PATH, has(...exist), "x64")).toBe(want);
  });

  test("ISC-53.1: a path the user typed is never swapped for a /usr/local binary", () => {
    const all = has("/usr/local/bin/fabric-ai", "/usr/local/bin/fabric");
    expect(resolveFabricPath(`${HOME}/bin/fabric`, all, "x64")).toBe(`${HOME}/bin/fabric`);
    expect(resolveFabricPath("/opt/homebrew/bin/fabric", all, "x64")).toBe("/opt/homebrew/bin/fabric");
  });

  test("ISC-53.2: when the default path exists, /usr/local is never consulted", () => {
    const asked: string[] = [];
    const got = resolveFabricPath(
      DEFAULT_FABRIC_PATH,
      (p) => {
        asked.push(p);
        return p === DEFAULT_FABRIC_PATH;
      },
      "x64",
    );
    expect(got).toBe(DEFAULT_FABRIC_PATH);
    expect(asked).toEqual([DEFAULT_FABRIC_PATH]);
  });

  test("ISC-53.4: Apple Silicon never consults /usr/local, even with the default missing", () => {
    const asked: string[] = [];
    const got = resolveFabricPath(
      DEFAULT_FABRIC_PATH,
      (p) => {
        asked.push(p);
        return p.startsWith("/usr/local/");
      },
      "arm64",
    );
    expect(got).toBe(DEFAULT_FABRIC_PATH);
    expect(asked.filter((p) => p.startsWith("/usr/local/"))).toEqual([]);
  });
});

describe("ISC-53.5: only a regular, executable file counts as fabric", () => {
  const dir = mkdtempSync(join(tmpdir(), "fabric-runnable-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const file = (name: string, mode: number) => {
    const p = join(dir, name);
    writeFileSync(p, "#!/bin/sh\n");
    chmodSync(p, mode);
    return p;
  };

  test("an executable file is runnable", () => {
    expect(isRunnableFile(file("exec", 0o755))).toBe(true);
  });

  test("a plain data file, a directory and a missing path are not", () => {
    expect(isRunnableFile(file("data", 0o644))).toBe(false);
    expect(isRunnableFile(dir)).toBe(false);
    expect(isRunnableFile(join(dir, "absent"))).toBe(false);
  });

  test("a symlink to an executable file is runnable (Homebrew links its binaries)", () => {
    const link = join(dir, "link");
    symlinkSync(file("target", 0o755), link);
    expect(isRunnableFile(link)).toBe(true);
  });
});
