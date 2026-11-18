import Path from "node:path";
import { constants as FS } from "node:fs";
import { appendFile, copyFile, mkdir, access } from "node:fs/promises";

import { Toast, showToast } from "@raycast/api";
import { parse, type Creator } from "@retorquere/bibtex-parser";

const stripDiacritics = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

const slugifyTitleForFilename = (title: string) => {
  const base = stripDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");

  return base.length > 60 ? base.slice(0, 60).replace(/_+$/g, "") : base;
};

const authorListForFilename = (authorsField?: Creator[]): string => {
  if (!authorsField) return "unknown";

  const extractName = (nameDict: { lastName?: string; name?: string }): string => {
    if (nameDict.name) {
      return nameDict.name;
    }
    return nameDict.lastName || "";
  };

  const authors = authorsField.map((a: Creator) => extractName(a)) || [];
  if (authors.length === 0) {
    return "unknown";
  } else if (authors.length === 1) {
    return authors[0];
  } else if (authors.length === 2) {
    return `${authors[0]}.${authors[1]}`;
  } else {
    return `${authors[0]}.etal`;
  }
};

const ensureUniquePath = async (dir: string, filename: string) => {
  const ext = Path.extname(filename);
  const base = Path.basename(filename, ext);

  let candidate = filename;
  for (let i = 2; i < 10_000; i++) {
    const full = Path.join(dir, candidate);
    try {
      await access(full, FS.F_OK);
      candidate = `${base}_${i}${ext}`;
    } catch {
      return full;
    }
  }
  return Path.join(dir, `${base}_${Date.now()}${ext}`);
};

const injectOrReplaceFileField = (bibtex: string, filename: string) => {
  const fileLine = `         file = {:${filename}:PDF}`;

  // Replace existing file field (handles optional trailing comma)
  if (/^\s*file\s*=/gim.test(bibtex)) {
    return bibtex.replace(/^\s*file\s*=\s*[{(].*?[})]\s*,?\s*$/gim, `${fileLine},`);
  }

  const trimmed = bibtex.trimEnd();

  const lastBrace = trimmed.lastIndexOf("}");
  if (lastBrace === -1) return `${trimmed}\n${fileLine}\n`;

  // Content before the final brace, with trailing whitespace removed
  let head = trimmed.slice(0, lastBrace).trimEnd();
  const tail = trimmed.slice(lastBrace); // includes final "}"

  // Ensure the last field line ends with a comma, but don't introduce a standalone comma line
  if (!head.endsWith(",")) head = head + ",";

  // Ensure exactly one blank-free newline before fileLine, and one newline before closing brace
  return `${head}\n${fileLine}\n${tail}`;
};

export async function addEntryToLibraryFromPdf(opts: {
  pdfPath: string;
  bibtexRaw: string;
  path: string; // library dir
  bibfile: string; // .bib file path
}): Promise<{ finalFilename: string; destFullPath: string; bibtexWithFile: string }> {
  const { pdfPath, bibtexRaw, path, bibfile } = opts;

  if (!pdfPath || !bibtexRaw?.trim()) {
    throw new Error("Missing PDF or BibTeX");
  }

  let title = "untitled";
  let authors: Creator[] | undefined = [];
  let year = 0;

  const parsed = parse(bibtexRaw);
  if (!parsed?.entries?.length) {
    throw new Error("No valid BibTeX entries found");
  }

  const entry = parsed.entries[0];
  title = entry.fields.title ? String(entry.fields.title).trim() : "untitled";
  authors = entry.fields.author;
  year = entry.fields.year ? Number.parseInt(String(entry.fields.year).trim(), 10) : 0;

  const authorlist = authorListForFilename(authors);
  const titleSlug = slugifyTitleForFilename(title || "untitled");
  const desiredFilename = `${authorlist}_${year || "????"}_${titleSlug}.pdf`;

  await mkdir(path, { recursive: true });

  const destFullPath = await ensureUniquePath(path, desiredFilename);
  const finalFilename = Path.basename(destFullPath);

  // Copy PDF into library
  await copyFile(pdfPath, destFullPath);

  // Inject/replace file field using final name (after dedupe)
  const bibtexWithFile = injectOrReplaceFileField(bibtexRaw, finalFilename);

  // Append to .bib (normalize to exactly 1 blank line between entries)
  const normalized = bibtexWithFile.trimEnd() + "\n\n";
  await appendFile(bibfile, normalized, "utf8");

  return { finalFilename, destFullPath, bibtexWithFile };
}

// Optional convenience wrapper if you want to keep toast behavior centralized.
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
