import { searchFiles } from "../lib/service";

type Input = {
  /** Finder tags to search for. Pass their exact spelling when known. */
  tags: string[];
  /** Require all tags, or match any one. Defaults to all. */
  match?: "all" | "any";
  /** Inclusive modification date in ISO 8601 format, for example 2026-03-01. */
  modifiedAfter?: string;
  /** Exclusive modification date in ISO 8601 format. Use the next month's start to bound a month. */
  modifiedBefore?: string;
  /** pdf, image, audio, video, folder, document, text, or a file extension. */
  kind?: string;
};

/** Find at most 50 tagged files. hasMore means the result is incomplete: narrow the search before a bulk write. */
export default async function tool(input: Input) {
  if (!input.tags.length) throw new Error("Provide at least one tag to search for.");
  const result = await searchFiles({ ...input, match: input.match ?? "all" }, 50);
  return {
    ...result,
    files: result.files.map((file) => ({
      path: file.path,
      name: file.name,
      kind: file.kind,
      modifiedAt: file.modifiedAt ?? null,
      tags: file.tags,
    })),
  };
}
