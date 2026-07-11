import type { PackageScore } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
};

/**
 * Fetch the score breakdown for a JSR package: which quality criteria are met
 * (readme, examples, doc coverage, fast-check, provenance, multi-runtime, ...) and the overall total.
 */
export default async function tool(input: Input): Promise<PackageScore> {
  return fetchJsrJson<PackageScore>(jsrUrls.api.score(input.scope, input.name));
}
