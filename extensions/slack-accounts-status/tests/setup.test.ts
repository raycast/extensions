import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";

test("Installed onboarding help contains the exact copyable Slack app manifest", async () => {
  const help = await readFile("help.md", "utf8");
  const manifest = await readFile("slack-app-manifest.json", "utf8");
  const jsonBlock = help.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(jsonBlock, "Users must be able to copy the manifest from installed onboarding help");
  assert.deepEqual(JSON.parse(jsonBlock[1]), JSON.parse(manifest));
});
