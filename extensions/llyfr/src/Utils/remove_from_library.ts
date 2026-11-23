import Path from "node:path";
import { access, readFile } from "node:fs/promises";

import { trash } from "@raycast/api";
import { parse } from "@retorquere/bibtex-parser";

import { pdfAttachments, removeEntry } from "./bibtex";
import { replaceFile, withLibraryLock } from "./library_file";

/** Windows paths are case-insensitive, so compare them that way there. */
const samePath = (a: string, b: string) =>
  process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;

/**
 * Remove an entry from the .bib file and move its PDF to the trash.
 *
 * The .bib file is only written if the result parses to exactly one entry less,
 * so a scanning mistake can never damage the library, and it is replaced in one
 * step. The PDF is kept if another entry still links to the same file.
 */
export async function removeEntryFromLibrary(opts: {
  key: string;
  file?: string;
  path: string; // library dir
  bibfile: string;
}): Promise<{ trashedPdf: boolean }> {
  const { key, file } = opts;

  return withLibraryLock(opts.bibfile, async (bibfile) => {
    const text = await readFile(bibfile, "utf8");
    const updated = removeEntry(text, key, file);

    const before = parse(text).entries.length;
    const remaining = parse(updated).entries;
    if (remaining.length !== before - 1) {
      throw new Error("Could not remove the entry safely, so the .bib file was left unchanged");
    }
    await replaceFile(bibfile, updated);

    if (!file) {
      return { trashedPdf: false };
    }
    const libraryDir = Path.resolve(opts.path);
    const pdf = Path.resolve(libraryDir, file);
    if (!pdf.startsWith(libraryDir + Path.sep)) {
      return { trashedPdf: false };
    }

    // Compare resolved paths, so `./paper.pdf` and `paper.pdf` count as the same file.
    const stillUsed = remaining.some((entry) =>
      pdfAttachments(String(entry.fields.file ?? "")).some((other) => samePath(Path.resolve(libraryDir, other), pdf)),
    );
    if (stillUsed) {
      return { trashedPdf: false };
    }

    try {
      await access(pdf);
    } catch {
      return { trashedPdf: false };
    }
    await trash(pdf);
    return { trashedPdf: true };
  });
}
