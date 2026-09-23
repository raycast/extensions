import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const keywords = createRequire(import.meta.url)("emojilib");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "data/unicode");
const output = path.join(root, "assets/catalogs");
const snapshot = JSON.parse(await readFile(path.join(root, "data/github-shortcodes.json"), "utf8"));
// GitHub image filenames omit presentation selectors and sometimes joiners.
// Match them to known Unicode entries instead of inserting joiners ourselves.
const identity = (emoji) => emoji.replace(/[\uFE0F\u200D]/gu, "");
const aliases = new Map();
for (const [alias, emoji] of Object.entries(snapshot.shortcodes)) {
  const key = identity(emoji);
  aliases.set(key, [...(aliases.get(key) ?? []), alias]);
}
await mkdir(output, { recursive: true });
await mkdir(path.join(root, "src/generated"), { recursive: true });
const labels = {};
const versions = (await readdir(source)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
for (const version of versions) {
  const text = await readFile(path.join(source, version, "emoji-test.txt"), "utf8");
  const entries = [];
  let category = "";
  for (const line of text.split(/\r?\n/u)) {
    const group = line.match(/^# group: (.*?)$/u);
    if (group) category = group[1];
    const match = line.match(/^.*?; fully-qualified\s+# (.*?) (?:E\d+\.\d+ )?(.*)$/u);
    if (!match || match[2].includes("skin tone")) continue;
    const [, emoji, description] = match;
    entries.push({
      emoji,
      description,
      category,
      keywords: keywords[emoji] ?? [],
      shortCode: aliases.get(identity(emoji)) ?? [],
    });
    labels[emoji] = { description, category };
  }
  if (entries.length === 0 || new Set(entries.map((entry) => entry.emoji)).size !== entries.length)
    throw new Error("Invalid Unicode catalog: " + version);
  await writeFile(path.join(output, version + ".json"), JSON.stringify(entries) + "\n");
}
await writeFile(path.join(root, "src/generated/labels.json"), JSON.stringify(labels) + "\n");
console.log(
  "Prepared " + versions.length + " offline catalogs and " + Object.keys(labels).length + " recent-item labels",
);
