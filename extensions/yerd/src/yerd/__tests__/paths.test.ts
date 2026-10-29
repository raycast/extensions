// Unit tests for yerd binary discovery. HOME/PATH are overridden per test so
// the real installation never interferes; the cache is reset between cases.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _resetCache, resolveYerdBinary } from "../paths";
import { YerdNotInstalledError } from "../errors";

const tmpDir = join(tmpdir(), `yerd-paths-test-${Date.now()}`);
let origHome: string | undefined;
let origPath: string | undefined;

before(() => {
  mkdirSync(tmpDir, { recursive: true });
  origHome = process.env.HOME;
  origPath = process.env.PATH;
});

after(() => {
  process.env.HOME = origHome;
  process.env.PATH = origPath;
  rmSync(tmpDir, { recursive: true, force: true });
  _resetCache();
});

function executableAt(path: string): string {
  writeFileSync(path, "#!/bin/sh\necho ok\n");
  chmodSync(path, 0o755);
  return path;
}

describe("resolveYerdBinary", () => {
  it("preference override: valid path → returns it", () => {
    _resetCache();
    const bin = executableAt(join(tmpDir, "fake-yerd-pref"));
    const result = resolveYerdBinary({ yerdPath: bin });
    assert.strictEqual(result, bin);
  });

  it("preference override: invalid path → throws YerdNotInstalledError naming the path", () => {
    _resetCache();
    assert.throws(
      () => resolveYerdBinary({ yerdPath: "/nonexistent/bin/yerd" }),
      (err: unknown) => {
        assert.ok(err instanceof YerdNotInstalledError);
        assert.ok(err.message.includes("/nonexistent/bin/yerd"));
        return true;
      },
    );
  });

  it("discovers binary from PATH when default path absent", () => {
    _resetCache();
    process.env.HOME = "/nonexistent-home";
    const bin = executableAt(join(tmpDir, "yerd"));
    process.env.PATH = `${tmpDir}:${origPath}`;
    const result = resolveYerdBinary({});
    assert.strictEqual(result, bin);
    process.env.HOME = origHome;
    process.env.PATH = origPath;
  });

  it("throws YerdNotInstalledError when no binary found anywhere", () => {
    _resetCache();
    process.env.HOME = "/nonexistent-home";
    process.env.PATH = "/nonexistent-dir";
    assert.throws(() => resolveYerdBinary({}), YerdNotInstalledError);
    process.env.HOME = origHome;
    process.env.PATH = origPath;
  });

  it("caches the resolved path (second call skips discovery)", () => {
    _resetCache();
    process.env.HOME = "/nonexistent-home";
    const bin = executableAt(join(tmpDir, "yerd"));
    process.env.PATH = `${tmpDir}:${origPath}`;
    const first = resolveYerdBinary({});
    assert.strictEqual(first, bin);
    // Now break discovery entirely — cached result must still be returned
    process.env.PATH = "/nonexistent-dir";
    const second = resolveYerdBinary({});
    assert.strictEqual(second, first);
    process.env.HOME = origHome;
    process.env.PATH = origPath;
  });
});
