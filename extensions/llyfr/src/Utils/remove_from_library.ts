import Path from "node:path";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";

import { trash } from "@raycast/api";
import { parse } from "@retorquere/bibtex-parser";

import { attachmentPaths, removeEntry } from "./bibtex";

/** Windows paths are case-insensitive, so compare them that way there. */
const samePath = (a: string, b: string) =>
  process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replace `file` with `content` without ever leaving it half-written: write a
 * temporary file next to it, then rename it over the original. Sync clients and
 * editors can lock the file for a moment, so the rename is retried a few times.
 */
async function replaceFile(file: string, content: string) {
  const tmp = `${file}.llyfr-tmp`;
  await writeFile(tmp, content, "utf8");
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(tmp, file);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (attempt < 5 && (code === "EPERM" || code === "EBUSY" || code === "EACCES")) {
        await sleep(200 * attempt);
        continue;
      }
      await unlink(tmp).catch(() => {});
      throw new Error(
        `Could not update ${Path.basename(file)} (${code ?? "unknown error"}). Is it open in another program? Your library was not changed.`,
      );
    }
  }
}

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
  const { key, file, bibfile } = opts;

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
    attachmentPaths(String(entry.fields.file ?? "")).some((other) => samePath(Path.resolve(libraryDir, other), pdf)),
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
}
