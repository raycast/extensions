import { isAbsolute, join, normalize } from "path";

import type { PaperEntity } from "./types";

export type PdfResolution = { ok: true; path: string } | { ok: false; error: string };

const REMOTE_PROTOCOLS = /^(https?|ftp|webdav|lmdb):\/\//i;

export function resolveLocalPdf(paper: PaperEntity, libraryFolder?: string): PdfResolution {
  const recorded = (paper.mainURL || "").trim();
  if (!recorded) {
    return {
      ok: false,
      error:
        "This paper has no local PDF path in the library record (empty mainURL). Attach a PDF in Paperlib, or add mainURL to the JSON/CSV export.",
    };
  }

  if (REMOTE_PROTOCOLS.test(recorded) && !recorded.toLowerCase().startsWith("file:")) {
    return {
      ok: false,
      error: `No local PDF to open. The library record points at a remote file (${protocolOf(recorded)}). Use Open Web Link, or download the PDF into your Paperlib library folder.`,
    };
  }

  const path = toFilesystemPath(recorded, libraryFolder);
  if (!path) {
    return {
      ok: false,
      error:
        "This paper’s mainURL is relative, but no Paperlib library folder is configured. Set Paperlib Library Folder in preferences.",
    };
  }

  return { ok: true, path };
}

export function paperWebUrl(paper: PaperEntity): string | null {
  if (paper.doi) {
    return `https://doi.org/${paper.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`;
  }

  if (paper.arxiv) {
    const id = paper.arxiv.replace(/^arxiv:/i, "").trim();
    return id ? `https://arxiv.org/abs/${id}` : null;
  }

  const recorded = (paper.mainURL || "").trim();
  if (/^https?:\/\//i.test(recorded)) {
    return recorded;
  }

  return null;
}

export function missingWebLinkMessage(paper: PaperEntity): string {
  return `No web link on “${paper.title || "this paper"}”. The library record has no DOI, arXiv id, or http(s) URL.`;
}

function toFilesystemPath(recorded: string, libraryFolder?: string): string | null {
  const withoutFile = stripFileProtocol(recorded);
  if (isAbsolute(withoutFile) || isWindowsAbsolute(withoutFile)) {
    return normalize(withoutFile);
  }

  if (!libraryFolder) {
    return null;
  }

  return normalize(join(libraryFolder, withoutFile));
}

function stripFileProtocol(url: string): string {
  if (!/^file:/i.test(url)) {
    return url;
  }

  let rest = url.replace(/^file:(\/\/)?/i, "");
  rest = rest.replace(/^localhost/i, "");
  try {
    rest = decodeURIComponent(rest);
  } catch {
    // Keep the raw path if it is not URI-encoded.
  }

  if (/^\/[A-Za-z]:[\\/]/.test(rest)) {
    return rest.slice(1);
  }

  return rest;
}

function isWindowsAbsolute(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path);
}

function protocolOf(url: string): string {
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  return match ? match[1] : "remote";
}
