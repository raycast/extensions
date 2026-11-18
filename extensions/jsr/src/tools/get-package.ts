import type { Package } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@" (e.g. "std" for `@std/fs`). */
  scope: string;
  /** Package name (e.g. "fs" for `@std/fs`). */
  name: string;
};

/**
 * Fetch the full metadata for a single JSR package: description, latest version,
 * runtime compatibility, score, archive flag, GitHub link, version/dependency counts.
 */
export default async function tool(input: Input): Promise<Package> {
  return fetchJsrJson<Package>(jsrUrls.api.package(input.scope, input.name));
}
