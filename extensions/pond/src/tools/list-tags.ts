import { pond } from "../api/client";
import { clampLimit } from "../api/tool-input";

type Input = {
  /** Only tags containing this text. Omit to list the most used tags. */
  query?: string;
  /** Tags to return, 1 to 500. Defaults to 100. */
  limit?: number;
};

export default async function tool(input: Input) {
  const needle = input.query?.trim().toLowerCase();
  const tags = (await pond().tags())
    .filter((tag) => !needle || tag.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.count - a.count);
  return { total: tags.length, tags: tags.slice(0, clampLimit(input.limit, 100, 500)) };
}
