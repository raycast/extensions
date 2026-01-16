import path from "node:path";
import { nanoid } from "nanoid";

export type KeyTemplateInput = {
  originalFileName: string;
  now?: Date;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function compactTime(now: Date): string {
  const yyyy = String(now.getFullYear());
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const HH = pad2(now.getHours());
  const MM = pad2(now.getMinutes());
  const SS = pad2(now.getSeconds());
  return `${yyyy}${mm}${dd}${HH}${MM}${SS}`;
}

function sanitizePathFragment(fragment: string): string {
  // Keep it simple: strip leading slashes and collapse repeats
  return fragment.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

export function buildObjectKey({
  keyTemplate,
  pathPrefix,
  filenameTemplate,
  input,
}: {
  keyTemplate?: string;
  pathPrefix?: string;
  filenameTemplate?: string;
  input: KeyTemplateInput;
}): string {
  const now = input.now ?? new Date();
  const ext = path.extname(input.originalFileName).replace(/^\./, "");
  const base = path.basename(input.originalFileName, path.extname(input.originalFileName));

  const tokens: Record<string, string> = {
    yyyy: String(now.getFullYear()),
    mm: pad2(now.getMonth() + 1),
    dd: pad2(now.getDate()),
    HH: pad2(now.getHours()),
    MM: pad2(now.getMinutes()),
    SS: pad2(now.getSeconds()),
    time: compactTime(now),
    epoch: String(now.getTime()),
    uuid: nanoid(),
    filename: path.basename(input.originalFileName),
    name: base,
    ext: ext || "bin",
  };

  const template = (keyTemplate?.trim() ||
    [pathPrefix?.trim(), filenameTemplate?.trim()].filter(Boolean).join("/") ||
    "uploads/{yyyy}/{mm}/{dd}/{uuid}.{ext}") as string;

  const rendered = template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, tokenName: string) => {
    const value = tokens[tokenName];
    return value ?? match;
  });

  return sanitizePathFragment(rendered);
}
