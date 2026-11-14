import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { createHash } from "node:crypto";
import createLoader from "./load-ts.ts";

function helpers(contents: Record<string, string>, calls: { binary: string; args: string[] }[] = []) {
  const load = createLoader({
    "@raycast/api": { environment: { assetsPath: "/assets", supportPath: "/support" } },
    "node:fs": {
      readFileSync: (file) => contents[path.basename(file)],
      existsSync: () => false,
    },
    "node:fs/promises": { mkdir: async () => {}, rename: async () => {}, rm: async () => {} },
    "node:child_process": {
      execFile: (binary, args, _options, callback) => {
        calls.push({ binary, args });
        callback(null, "", "");
      },
    },
  });
  return load("src/helpers/native-helper.ts");
}

test("shared Swift source changes invalidate the binary cache without changing single-file helper keys", async () => {
  const contents: Record<string, string> = {
    "runtime-status.swift": "entry",
    "chromium-ax.swift": "browser entry",
    "browser-tab-references.swift": "references",
    "browser-helper-runtime.swift": "runtime",
    "browser-accessibility.swift": "accessibility",
  };
  const first = helpers(contents);
  const originalSingleHash = createHash("sha256").update(contents["runtime-status.swift"]).digest("hex").slice(0, 12);
  assert.equal(
    first.resolveNativeHelper("runtime-status", "/fallback").binaryPath,
    `/support/runtime-status-${originalSingleHash}`,
  );

  const dependencies = ["browser-tab-references.swift", "browser-helper-runtime.swift", "browser-accessibility.swift"];
  const before = first.resolveNativeHelper("chromium-ax", "/fallback");
  for (const dependency of dependencies) {
    // A fresh loader represents the next Raycast host process after a source update.
    const changed = helpers({ ...contents, [dependency]: contents[dependency] + " changed" });
    const after = changed.resolveNativeHelper("chromium-ax", "/fallback");
    assert.notEqual(before.binaryPath, after.binaryPath, `${dependency} must be part of the cache key`);
  }

  const calls: { binary: string; args: string[] }[] = [];
  const compiler = helpers(contents, calls);
  const [one, two] = await Promise.all([
    compiler.ensureNativeHelper("chromium-ax", "/fallback"),
    compiler.ensureNativeHelper("chromium-ax", "/fallback"),
  ]);
  assert.equal(one, two);
  assert.equal(calls.length, 1, "Concurrent callers must share one compilation");
  assert.equal(calls[0].binary, "/usr/bin/swiftc");
  assert.deepEqual(calls[0].args.slice(0, -2), [
    "-O",
    "/assets/chromium-ax.swift",
    "/assets/browser-tab-references.swift",
    "/assets/browser-helper-runtime.swift",
    "/assets/browser-accessibility.swift",
  ]);
});
