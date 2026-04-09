import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const soundStorePath = join(__dirname, "..", "src", "lib", "sound-store.ts");

test("extension-side default sound pack uses the bundled Claude mp3s", async () => {
  const source = await readFile(soundStorePath, "utf8");

  assert.match(source, /id: "claude-ready-to-work"/);
  assert.match(source, /filename: "readytowork\.mp3"/);
  assert.match(source, /id: "claude-jobs-done"/);
  assert.match(source, /filename: "jobs_done\.mp3"/);
  assert.match(
    source,
    /needs_input:\s*\{\s*soundId: "claude-ready-to-work", enabled: true\s*\}/,
  );
  assert.match(
    source,
    /done:\s*\{\s*soundId: "claude-jobs-done", enabled: true\s*\}/,
  );
});
