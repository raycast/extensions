import type { ApiResults, VersionPackage } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
  /** Maximum number of versions to return. Defaults to 50. Clamped to [1, 200]. */
  limit?: number;
};

type VersionSummary = {
  version: string;
  yanked: boolean;
  usesNpm: boolean;
  readmePath: string | null;
  updatedAt: string;
  createdAt: string;
};

/**
 * List published versions for a JSR package, newest first.
 */
export default async function tool(input: Input): Promise<{ total: number; versions: VersionSummary[] }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const data = await fetchJsrJson<ApiResults<VersionPackage> | VersionPackage[]>(
    jsrUrls.api.versions(input.scope, input.name),
  );
  const items = Array.isArray(data) ? data : (data.items ?? []);
  return {
    total: items.length,
    versions: items.slice(0, limit).map((v) => ({
      version: v.version,
      yanked: v.yanked,
      usesNpm: v.usesNpm,
      readmePath: v.readmePath,
      updatedAt: v.updatedAt,
      createdAt: v.createdAt,
    })),
  };
}
