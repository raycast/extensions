import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("the installed icon reference changes whenever its image content changes", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const icon = await readFile(new URL(`../assets/${manifest.icon}`, import.meta.url));
  const digest = createHash("sha256").update(icon).digest("hex").slice(0, 8);
  assert.equal(manifest.icon, `screenflare-icon-${digest}.png`);
  for (const command of manifest.commands) {
    assert.ok(!command.icon || command.icon === manifest.icon, `${command.name} overrides the current extension icon`);
  }
});
