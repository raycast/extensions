import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("release build preserves a mismatched dependency checkout, including when library artifacts are cached", () => {
  for (const cached of [false, true]) {
    const root = mkdtempSync(join(tmpdir(), "lens-build-preserve-"));
    try {
      for (const dir of ["scripts", "bin", "Vendor/llama.cpp", "Vendor/llama/lib"]) mkdirSync(join(root, dir), { recursive: true });
      for (const file of ["build-llama.sh", "llama.cpp-no-logits.patch"]) copyFileSync(new URL(`../native/scripts/${file}`, import.meta.url), join(root, "scripts", file));
      writeFileSync(join(root, "Vendor/llama.cpp/local-edit"), "keep this edit");
      writeFileSync(join(root, "bin/uname"), "#!/bin/sh\necho Darwin\n", { mode: 0o755 });
      writeFileSync(join(root, "bin/git"), '#!/bin/sh\nif [ "$3" = "rev-parse" ]; then echo wrong-revision; else exit 99; fi\n', { mode: 0o755 });
      if (cached) {
        const patch = createHash("sha256").update(readFileSync(join(root, "scripts/llama.cpp-no-logits.patch"))).digest("hex").slice(0, 12);
        writeFileSync(join(root, "Vendor/llama/lib/libllamacpp.a"), "cached library");
        writeFileSync(join(root, "Vendor/llama/BUILD"), `b11461 ${patch} metal lens-release-prefix-v1\n`);
      }
      const result = spawnSync("bash", ["scripts/build-llama.sh"], { cwd: root, encoding: "utf8", env: { ...process.env, PATH: join(root, "bin") + ":" + process.env.PATH } });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /not building it/);
      assert.equal(readFileSync(join(root, "Vendor/llama.cpp/local-edit"), "utf8"), "keep this edit");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});
