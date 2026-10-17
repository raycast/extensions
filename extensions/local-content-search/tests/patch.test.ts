import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const exec = promisify(execFile);
const PATCH =
  "--- a/input.txt\n+++ b/input.txt\n@@ -1 +1 @@\n-before\n+after\n";

// Execute git-apply against real fixture trees, including a poisoned matching cache stamp.
test("build patch applies once and rejects incompatible source even with a cache", async () => {
  const root = await mkdtemp(join(tmpdir(), "patch-test-"));
  const native = join(root, "native");
  const source = join(native, "Vendor/llama.cpp");
  const scripts = join(native, "scripts");
  await mkdir(source, { recursive: true });
  await mkdir(scripts);
  await exec("git", ["init", "--quiet", source]);
  await writeFile(join(source, "input.txt"), "before\n");
  await exec("git", ["-C", source, "add", "input.txt"]);
  await exec("git", [
    "-C",
    source,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Fixture",
  ]);
  await exec("git", ["-C", source, "tag", "b11461"]);
  const patch = join(scripts, "llama.cpp-no-logits.patch");
  await writeFile(patch, PATCH);
  const checker = resolve("native/scripts/check-llama-patch.sh");
  try {
    await exec("/bin/bash", [checker, source, patch]);
    assert.equal(await readFile(join(source, "input.txt"), "utf8"), "after\n");
    await exec("/bin/bash", [checker, source, patch]);
    await writeFile(join(source, "input.txt"), "incompatible\n");
    await assert.rejects(exec("/bin/bash", [checker, source, patch]));
    await copyFile(
      resolve("native/scripts/build-llama.sh"),
      join(scripts, "build-llama.sh"),
    );
    await copyFile(checker, join(scripts, "check-llama-patch.sh"));
    await mkdir(join(native, "Vendor/llama/lib"), { recursive: true });
    await writeFile(
      join(native, "Vendor/llama/lib/libllamacpp.a"),
      "cached fixture",
    );
    await writeFile(
      join(native, "Vendor/llama/BUILD"),
      `b11461 ${createHash("sha256").update(PATCH).digest("hex").slice(0, 12)}\n`,
    );
    await assert.rejects(exec("/bin/bash", [join(scripts, "build-llama.sh")]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
