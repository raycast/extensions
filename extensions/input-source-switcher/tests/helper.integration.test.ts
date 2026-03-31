import { execFileSync, spawnSync } from "child_process";
import path from "path";
import { parseSources } from "../src/sources";

const BINARY = path.resolve(__dirname, "../swift/.build/release/InputSourceHelper");

// Skip the entire suite if the binary hasn't been compiled yet.
// Run `swift build -c release --package-path swift/` to build it.
const binaryExists = (() => {
  try {
    execFileSync(BINARY, ["list"], { stdio: "pipe" });
    return true;
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    return true; // binary exists but errored — let the tests run and report
  }
})();

const describeIfBuilt = binaryExists ? describe : describe.skip;

describeIfBuilt("InputSourceHelper binary — list subcommand", () => {
  it("exits 0 and outputs valid JSON", () => {
    const result = spawnSync(BINARY, ["list"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("returns at least one source", () => {
    const result = spawnSync(BINARY, ["list"], { encoding: "utf8" });
    const sources = parseSources(result.stdout);
    expect(sources.length).toBeGreaterThan(0);
  });

  it("every source has a non-empty id, name, and kind", () => {
    const result = spawnSync(BINARY, ["list"], { encoding: "utf8" });
    const sources = parseSources(result.stdout);
    for (const source of sources) {
      expect(source.id.length).toBeGreaterThan(0);
      expect(source.name.length).toBeGreaterThan(0);
      expect(source.kind.length).toBeGreaterThan(0);
    }
  });

  it("does not include CharacterPalette or PressAndHold in output", () => {
    const result = spawnSync(BINARY, ["list"], { encoding: "utf8" });
    const sources = parseSources(result.stdout);
    const ids = sources.map((s) => s.id);
    expect(ids).not.toContain("com.apple.CharacterPaletteIM");
    expect(ids).not.toContain("com.apple.PressAndHold");
    // Also check by kind value
    const kinds = sources.map((s) => s.kind);
    expect(kinds).not.toContain("CharacterPalette");
    expect(kinds).not.toContain("PressAndHold");
  });
});

describeIfBuilt("InputSourceHelper binary — switch subcommand", () => {
  it("exits non-zero for an unknown source ID", () => {
    const result = spawnSync(BINARY, ["switch", "com.example.nonexistent.layout"], {
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/not found/i);
  });
});

describeIfBuilt("InputSourceHelper binary — argument handling", () => {
  it("exits non-zero with no arguments", () => {
    const result = spawnSync(BINARY, [], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/usage/i);
  });

  it("exits non-zero with an unknown subcommand", () => {
    const result = spawnSync(BINARY, ["frobnicate"], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/usage/i);
  });

  it("switch with missing ID argument exits non-zero", () => {
    const result = spawnSync(BINARY, ["switch"], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/usage/i);
  });
});
