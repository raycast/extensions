import type { ApiResults, Dependent } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
  /** Maximum number of dependents to return. Defaults to 100. Clamped to [1, 200]. */
  limit?: number;
};

/**
 * List packages that depend on the given JSR package (incoming edges).
 * Useful for popularity / ecosystem analysis.
 */
export default async function tool(input: Input): Promise<{ total: number; dependents: Dependent[] }> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
  const data = await fetchJsrJson<ApiResults<Dependent>>(jsrUrls.api.dependents(input.scope, input.name, limit));
  return { total: data.total, dependents: data.items };
}
