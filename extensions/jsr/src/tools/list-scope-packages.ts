import type { ApiResults, Package, RuntimeCompat } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@" (e.g. "std" to list all `@std/*` packages). */
  scope: string;
  /** Maximum number of packages to return. Defaults to 100. Clamped to [1, 200]. */
  limit?: number;
};

type PackageSummary = {
  id: string;
  scope: string;
  name: string;
  description: string;
  score: number | null;
  latestVersion: string | null;
  runtimeCompat?: RuntimeCompat;
  isArchived: boolean | null;
};

/**
 * List all JSR packages within a given scope.
 */
export default async function tool(input: Input): Promise<{ total: number; packages: PackageSummary[] }> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
  const data = await fetchJsrJson<ApiResults<Package>>(jsrUrls.api.scopePackages(input.scope, limit));
  return {
    total: data.total,
    packages: data.items.map((p) => ({
      id: `@${p.scope}/${p.name}`,
      scope: p.scope,
      name: p.name,
      description: p.description,
      score: p.score,
      latestVersion: p.latestVersion,
      runtimeCompat: p.runtimeCompat,
      isArchived: p.isArchived,
    })),
  };
}
