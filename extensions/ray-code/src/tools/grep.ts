import { readFile } from "node:fs/promises";
import { resolveAndValidatePath } from "../utils/workspace";

type Input = {
  /**
   * The relative path to the file from the workspace root
   */
  path: string;
  /**
   * The search query
   */
  query: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function ({ path, query }: Input) {
  const filePath = resolveAndValidatePath(path);
  const content = await readFile(filePath, "utf8");
  const escapedQuery = escapeRegExp(query);
  const matches = content.match(new RegExp(escapedQuery, "g"));

  return matches || [];
}
