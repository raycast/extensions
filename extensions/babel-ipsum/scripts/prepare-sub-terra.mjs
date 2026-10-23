import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

export function modernizeParagraph(text, story, paragraph, corrections, edits) {
  let modernized = text.normalize("NFC").replace(/\p{L}+/gu, (word) => {
    const replacement = corrections[word.toLocaleLowerCase("es")];
    if (replacement === undefined) return word;
    if (word === word.toLocaleUpperCase("es")) return replacement.toLocaleUpperCase("es");
    if (word[0] === word[0].toLocaleUpperCase("es")) {
      return replacement[0].toLocaleUpperCase("es") + replacement.slice(1);
    }
    return replacement;
  });
  for (const edit of edits.filter((edit) => edit.story === story && edit.paragraph === paragraph)) {
    if (!edit.find || modernized.split(edit.find).length !== 2) {
      throw new Error(`${story}, paragraph ${paragraph}: correction must match exactly once: ${edit.find}`);
    }
    modernized = modernized.replace(edit.find, edit.replace);
  }
  return modernized.replace(/\s+/gu, " ").trim();
}

export function prepareSubTerra() {
  const original = readJSON("corpus/editorial/sub-terra/original.json");
  const corrections = readJSON("corpus/editorial/sub-terra/corrections.json");
  const edits = readJSON("corpus/editorial/sub-terra/edits.json");
  if (original.stories.length !== 13 || new Set(original.stories.map((story) => story.id)).size !== 13) {
    throw new Error("The corpus must contain all thirteen distinct stories.");
  }
  for (const edit of edits) {
    const story = original.stories.find((story) => story.slug === edit.story);
    if (!story || !Number.isInteger(edit.paragraph) || !story.paragraphs[edit.paragraph - 1]) {
      throw new Error(`Unknown correction target: ${edit.story}, paragraph ${edit.paragraph}`);
    }
  }
  return {
    schemaVersion: 1,
    book: {
      id: "sub-terra",
      title: "Sub terra",
      author: "Baldomero Lillo",
      language: "Spanish",
      locale: "es",
      direction: "ltr",
      sourceUrl: original.source,
      edition: "1904 / 1917 story grouping",
      scope: "All thirteen stories indexed under the 1904 and 1917 editions.",
      license:
        "Original literary text is public domain; the prepared modernization and any protected Wikisource contributions are provided under CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/. Public-domain elements remain unrestricted by that license.",
      attribution:
        "Baldomero Lillo; Wikisource contributors; prepared modernization by Felipe Rovere / Babel Ipsum. See corpus/NOTICE.md and corpus/LICENSE.md.",
      editorialNote:
        "Spelling and accents modernized; verified transcription errors corrected. See corpus/editorial/sub-terra/MODERNIZATION.md.",
      sentenceSeparator: " ",
    },
    retrievedOn: original.retrievedOn,
    sections: original.stories.map((story, index) => ({
      id: story.slug,
      title: story.title,
      position: index + 1,
      edition: String(story.edition),
      sourceUrl: story.url,
      revisionUrl: story.revisionUrl,
      snapshotPath: `.cache/corpus/sources/sub-terra/${story.slug}.html`,
      snapshotSha256: story.snapshotSha256,
      passages: story.paragraphs.map((text, position) => ({
        position: position + 1,
        kind: "prose",
        text: modernizeParagraph(text, story.slug, position + 1, corrections, edits),
      })),
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = join(root, "corpus/books/sub-terra.json");
  const output = JSON.stringify(prepareSubTerra(), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== output)
      throw new Error("Sub terra prepared text is stale; run corpus:prepare:sub-terra.");
    console.log("Sub terra prepared text matches its editorial inputs.");
  } else {
    writeFileSync(path, output);
    console.log("Prepared corpus/books/sub-terra.json.");
  }
}
