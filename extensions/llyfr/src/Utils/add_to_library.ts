import Path from "node:path";
import { constants as FS } from "node:fs";
import { appendFile, copyFile, mkdir, readFile, unlink } from "node:fs/promises";

import { Toast, showToast } from "@raycast/api";
import { parse, type Creator, type Entry } from "@retorquere/bibtex-parser";

import { type EntryLike, authorsPart, findDuplicate, setFileField, titleSlug, yearPart } from "./bibtex";
import { withLibraryLock } from "./library_file";

const lastName = (creator: Creator): string => creator.name || creator.lastName || "";

/** Parse pasted BibTeX and require exactly one entry with a citation key. */
function parseSingleEntry(bibtex: string): Entry {
  let entries: Entry[];
  try {
    entries = parse(bibtex).entries;
  } catch (e) {
    throw new Error(`Could not parse BibTeX: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (entries.length === 0) {
    throw new Error("No valid BibTeX entry found");
  }
  if (entries.length > 1) {
    throw new Error(`Paste exactly one BibTeX entry (found ${entries.length})`);
  }
  if (!entries[0].key) {
    throw new Error("The BibTeX entry has no citation key");
  }
  return entries[0];
}

async function readLibrary(bibfile: string): Promise<string> {
  try {
    return await readFile(bibfile, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw e;
  }
}

const toEntryLike = (entry: Entry): EntryLike => ({
  key: entry.key,
  fields: entry.fields as unknown as Record<string, unknown>,
});

/** Refuse a paper that is already in the library, even under a different citation key. */
function assertNotInLibrary(library: string, entry: Entry) {
  const duplicate = findDuplicate(toEntryLike(entry), parse(library).entries.map(toEntryLike));
  if (duplicate) {
    throw new Error(`Already in your library as "${duplicate.key}" (same ${duplicate.reason})`);
  }
}

/**
 * Copy `src` into `dir` under `filename`, or `<name>_2.pdf`, `<name>_3.pdf`, ... if
 * that name is taken. COPYFILE_EXCL makes the check and the copy one step, so two
 * imports running at once can't overwrite each other.
 */
async function copyToNewFile(src: string, dir: string, filename: string): Promise<string> {
  const ext = Path.extname(filename);
  const base = Path.basename(filename, ext);
  for (let i = 1; i < 1000; i++) {
    const dest = Path.join(dir, i === 1 ? filename : `${base}_${i}${ext}`);
    if (Path.dirname(dest) !== dir) {
      throw new Error(`Refusing to write outside the library folder: ${dest}`);
    }
    try {
      await copyFile(src, dest, FS.COPYFILE_EXCL);
      return dest;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") {
        throw e;
      }
    }
  }
  throw new Error(`Too many files named like ${filename} in the library folder`);
}

export async function addEntryToLibraryFromPdf(opts: {
  pdfPath: string;
  bibtexRaw: string;
  path: string; // library dir
  bibfile: string; // .bib file path
}): Promise<{ finalFilename: string; destFullPath: string; bibtexWithFile: string }> {
  const { pdfPath, bibtexRaw } = opts;
  if (!pdfPath || !bibtexRaw?.trim()) {
    throw new Error("Missing PDF or BibTeX");
  }
  const entry = parseSingleEntry(bibtexRaw);

  // The duplicate check and the append must see the same file, so no other
  // change to the library can happen in between.
  return withLibraryLock(opts.bibfile, (bibfile) => addParsedEntry({ ...opts, bibfile }, entry));
}

async function addParsedEntry(
  opts: { pdfPath: string; bibtexRaw: string; path: string; bibfile: string },
  entry: Entry,
): Promise<{ finalFilename: string; destFullPath: string; bibtexWithFile: string }> {
  const { pdfPath, bibtexRaw, bibfile } = opts;

  // Validate everything before touching the library.
  const library = await readLibrary(bibfile);
  assertNotInLibrary(library, entry);

  const title = entry.fields.title ? String(entry.fields.title).trim() : "";
  const year = Number.parseInt(String(entry.fields.year ?? "").trim(), 10);
  const authors = (entry.fields.author ?? []).map(lastName);
  const desiredFilename = `${authorsPart(authors)}_${yearPart(year)}_${titleSlug(title)}.pdf`;

  const libraryDir = Path.resolve(opts.path);
  await mkdir(libraryDir, { recursive: true });
  const destFullPath = await copyToNewFile(pdfPath, libraryDir, desiredFilename);
  const finalFilename = Path.basename(destFullPath);

  try {
    const bibtexWithFile = setFileField(bibtexRaw, finalFilename);
    const check = parseSingleEntry(bibtexWithFile);
    if (!String(check.fields.file ?? "").includes(finalFilename)) {
      throw new Error("Could not add the file field to the BibTeX entry");
    }

    const separator = library === "" || library.endsWith("\n") ? "" : "\n";
    await appendFile(bibfile, `${separator}${bibtexWithFile.trim()}\n\n`, "utf8");
    return { finalFilename, destFullPath, bibtexWithFile };
  } catch (e) {
    // Don't leave a PDF in the library that no entry points to.
    await unlink(destFullPath).catch(() => {});
    throw e;
  }
}

export async function addEntryToLibraryFromPdfWithToast(opts: {
  pdfPath: string;
  bibtexRaw: string;
  path: string;
  bibfile: string;
}): Promise<{ finalFilename: string }> {
  await showToast({ style: Toast.Style.Animated, title: "Adding to library…" });
  const { finalFilename } = await addEntryToLibraryFromPdf(opts);
  await showToast({ style: Toast.Style.Success, title: "Added", message: finalFilename });
  return { finalFilename };
}
