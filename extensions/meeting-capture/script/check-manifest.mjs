import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const command = manifest.commands.find((item) => item.name === "toggle-meeting-capture");
const outputDirectory = manifest.preferences?.find((item) => item.name === "outputDirectory");
const transcriptLanguage = manifest.preferences?.find((item) => item.name === "transcriptLanguage");

assert.equal(manifest.title, "Meeting Capture");
assert.equal(outputDirectory?.default, `~/Documents/${manifest.title}`);
assert.equal(transcriptLanguage?.title, "Transcript Language");
assert.equal(transcriptLanguage?.default, "system-default");
assert.deepEqual(
  transcriptLanguage?.data.map((item) => item.title),
  ["Vietnamese", "English", "Vietnamese + English", "System Default"],
);
assert.deepEqual(
  manifest.commands.map((item) => item.name),
  ["start-meeting-capture", "pause-meeting-capture", "continue-meeting-capture", "stop-meeting-capture", "toggle-meeting-capture"],
);
console.log("Manifest recording folder matches the canonical extension title.");
