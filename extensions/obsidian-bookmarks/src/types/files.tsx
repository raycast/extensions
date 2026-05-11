import { FrontMatterResult } from "front-matter";
import { isStringArray } from "./is-string-array";

export function isFrontMatter(v: unknown): v is FrontMatter {
  if (v == null || typeof v !== "object") return false;
  const frontMatter = v as FrontMatter;
  return (
    typeof frontMatter.source === "string" &&
    typeof frontMatter.title === "string" &&
    // typeof frontMatter.saved === "string" &&
    typeof frontMatter.read === "boolean" &&
    (frontMatter.publisher == null || typeof frontMatter.publisher === "string") &&
    isStringArray(frontMatter.tags)
  );
}

export function isFile(v: unknown): v is File {
  if (v == null || typeof v !== "object") return false;
  const file = v as File;
  return (
    (file.body == null || typeof file.body === "string") &&
    (file.bodyBegin == null || typeof file.bodyBegin === "number") &&
    (file.frontmatter == null || typeof file.frontmatter === "string") &&
    typeof file.fileName === "string" &&
    typeof file.fullPath === "string" &&
    typeof file.mtime === "number" && // mtime is a timestamp number
    isFrontMatter(file.attributes)
  );
}

export function unique(files: File[]): File[] {
  const record = files.reduce((memo, file) => ({ ...memo, [file.fullPath]: file }), {} as Record<string, File>);
  return Object.values(record);
}

export interface FrontMatter {
  source: string;
  publisher: string | null;
  title: string;
  tags: string[];
  saved: Date;
  read: boolean;
}

export interface File extends Omit<FrontMatterResult<FrontMatter>, "body" | "bodyBegin"> {
  fileName: string;
  fullPath: string;
  mtime: number; // Unix timestamp in milliseconds
  body?: string;
  bodyBegin?: number;
}
