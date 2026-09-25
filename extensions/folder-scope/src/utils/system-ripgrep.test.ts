import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { resolveSystemRipgrep } from "./system-ripgrep.ts";

test("resolves an executable rg from PATH with spaces and Unicode", async () => {
  const root = await mkdtemp(join(tmpdir(), "folder-scope-system-rg-"));
  const first = join(root, "not executable");
  const second = join(root, "Türkçe Araçlar");
  try {
    await mkdir(first);
    await mkdir(second);
    await writeFile(join(first, "rg"), "no");
    await writeFile(join(second, "rg"), "yes");
    await chmod(join(second, "rg"), 0o755);

    const result = await resolveSystemRipgrep({
      pathValue: [first, second].join(delimiter),
      platform: "linux",
    });
    assert.equal(result, join(second, "rg"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("returns undefined when PATH has no executable rg", async () => {
  const root = await mkdtemp(join(tmpdir(), "folder-scope-no-rg-"));
  try {
    assert.equal(await resolveSystemRipgrep({ pathValue: root, platform: "linux" }), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
