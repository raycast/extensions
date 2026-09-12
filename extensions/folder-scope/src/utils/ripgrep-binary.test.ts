import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getBundledRipgrepAsset, hasExpectedSha256, installBundledRipgrep, sha256 } from "./ripgrep-binary.ts";

test("selects fixed assets and checksums for Apple Silicon and Intel", () => {
  const arm = getBundledRipgrepAsset("darwin", "arm64");
  assert.equal(arm.target, "aarch64-apple-darwin");
  assert.equal(arm.sha256, "de44338ca53677968bdd7403ddc1cf9c735e708f7b63e3b34367f9411010a7db");
  assert.match(arm.url, /ripgrep-v13\.0\.0-10-aarch64-apple-darwin\.tar\.gz$/);

  const intel = getBundledRipgrepAsset("darwin", "x64");
  assert.equal(intel.target, "x86_64-apple-darwin");
  assert.equal(intel.sha256, "3b501c05ff9b1d24ae8897dd1c6b5bf842fd12a6f7114264407ac42bc222b25b");
});

test("rejects unsupported platforms and architectures instead of guessing", () => {
  assert.throws(() => getBundledRipgrepAsset("linux", "arm64"), /unsupported on platform/);
  assert.throws(() => getBundledRipgrepAsset("darwin", "ia32"), /unsupported on architecture/);
});

test("verifies SHA-256 without trusting response metadata", () => {
  const bytes = Buffer.from("verified archive");
  const digest = sha256(bytes);
  assert.equal(digest, "040a1170825ade3ff37b189dd280153ecfafb99ee929d1cbebb40fe135afdf26");
  assert.equal(hasExpectedSha256(bytes, digest), true);
  assert.equal(hasExpectedSha256(Buffer.from("changed"), digest), false);
});

test("reuses an existing executable in supportPath without downloading", async () => {
  const supportPath = await mkdtemp(join(tmpdir(), "folder-scope-rg-"));
  const binaryPath = join(supportPath, "bin", "rg");
  try {
    await mkdir(join(supportPath, "bin"));
    await writeFile(binaryPath, "existing");
    await chmod(binaryPath, 0o755);
    const resolved = await installBundledRipgrep(supportPath, {
      platform: "darwin",
      architecture: "arm64",
      fetchImpl: async () => {
        throw new Error("download should not run");
      },
    });
    assert.equal(resolved, binaryPath);
  } finally {
    await rm(supportPath, { recursive: true, force: true });
  }
});
