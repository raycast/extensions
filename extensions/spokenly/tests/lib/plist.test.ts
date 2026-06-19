import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readJSONPref, tryReadJSONPref, writeJSONPref } from "../../src/lib/plist";

function makeEmptyPlist(): string {
  const dir = mkdtempSync(join(tmpdir(), "spokenly-plist-"));
  const plistPath = join(dir, "test.plist");
  execFileSync("/usr/bin/plutil", [
    "-create",
    "binary1",
    plistPath,
  ]);
  return plistPath;
}

describe("plist", () => {
  let plistPath: string;

  beforeEach(() => {
    plistPath = makeEmptyPlist();
  });

  afterEach(() => {
    try {
      rmSync(join(plistPath, ".."), { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("round-trips a string value stored as JSON-encoded Data", () => {
    writeJSONPref("transcriptionModelID", "parakeetTDT06", plistPath);
    const out = readJSONPref<string>("transcriptionModelID", plistPath);
    expect(out).toBe("parakeetTDT06");
  });

  it("round-trips an object value (mainPrompt-like)", () => {
    const payload = {
      id: "abc-123",
      name: "Main Prompt",
      shortcut: { keys: { keyCode: 15, rawFlags: 1310720 } },
      enabledTools: [] as string[],
    };
    writeJSONPref("mainPrompt", payload, plistPath);
    const out = readJSONPref<typeof payload>("mainPrompt", plistPath);
    expect(out).toEqual(payload);
  });

  it("round-trips an array value (recentDictationModels-like)", () => {
    const payload = [
      { modelID: "parakeetTDT06", lastUsedDate: 800716812.69 },
      { modelID: "gpt-4o-mini-transcribe", lastUsedDate: 800716615.43 },
    ];
    writeJSONPref("recentDictationModels", payload, plistPath);
    const out =
      readJSONPref<typeof payload>("recentDictationModels", plistPath);
    expect(out).toEqual(payload);
  });

  it("stored value is a Data type (not a string) — matches Spokenly's format", () => {
    writeJSONPref("transcriptionModelID", "parakeetTDT06", plistPath);
    const dump = execFileSync(
      "/usr/bin/plutil",
      ["-p", plistPath],
      { encoding: "utf-8" },
    );
    // plutil -p prints `{length = ..., bytes = 0x...}` for Data, never `"..."`.
    expect(dump).toMatch(/transcriptionModelID.*length\s*=/);
  });

  it("tryReadJSONPref returns null for missing key instead of throwing", () => {
    const out = tryReadJSONPref<string>("doesNotExist", plistPath);
    expect(out).toBeNull();
  });
});
