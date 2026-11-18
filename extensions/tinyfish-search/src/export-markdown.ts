import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export function markdownFilename(title: string) {
  const safe =
    Array.from(title, (character) => (character.charCodeAt(0) < 32 ? "-" : character))
      .join("")
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/[. ]+$/g, "")
      .trim() || "page";
  const name = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(safe) ? `_${safe}` : safe;
  let base = "";
  let bytes = 0;
  // A 100-byte basename leaves room for .md and numbered collision suffixes.
  for (const character of name) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > 100) break;
    base += character;
    bytes += size;
  }
  return `${base}.md`;
}

export async function exportMarkdown(directory: string, title: string, markdown: string) {
  const filename = markdownFilename(title);
  const base = filename.slice(0, -3);
  for (let suffix = 0; ; suffix++) {
    const destination = join(directory, suffix ? `${base} (${suffix}).md` : filename);
    try {
      await writeFile(destination, markdown, { encoding: "utf8", flag: "wx" });
      return destination;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    }
  }
}
