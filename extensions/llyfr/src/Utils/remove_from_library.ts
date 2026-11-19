import Path from "node:path";
import { access, readFile, writeFile } from "node:fs/promises";

import { trash } from "@raycast/api";
import { parse } from "@retorquere/bibtex-parser";

import { removeEntry } from "./bibtex";

/**
 * Remove an entry from the .bib file and move its PDF to the trash.
 *
 * The .bib file is only written if the result parses to exactly one entry less,
 * so a scanning mistake can never damage the library. The PDF is kept if another
 * entry still links to it.
 */
export async function removeEntryFromLibrary(opts: {
  key: string;
  file?: string;
  path: string; // library dir
  bibfile: string;
}): Promise<{ trashedPdf: boolean }> {
  const { key, file, bibfile } = opts;

  const text = await readFile(bibfile, "utf8");
  const updated = removeEntry(text, key, file);

  const before = parse(text).entries.length;
  const after = parse(updated).entries.length;
  if (after !== before - 1) {
    throw new Error("Could not remove the entry safely, so the .bib file was left unchanged");
  }
  await writeFile(bibfile, updated, "utf8");

  if (!file || updated.includes(file)) {
    return { trashedPdf: false };
  }
  const libraryDir = Path.resolve(opts.path);
  const pdf = Path.resolve(libraryDir, file);
  if (!pdf.startsWith(libraryDir + Path.sep)) {
    return { trashedPdf: false };
  }
  try {
    await access(pdf);
  } catch {
    return { trashedPdf: false };
  }
  await trash(pdf);
  return { trashedPdf: true };
}
