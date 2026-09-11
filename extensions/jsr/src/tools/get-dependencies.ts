import type { Dependency, Package } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
  /** Version. Defaults to the package's latest version. */
  version?: string;
  /** Maximum number of dependencies to return. Defaults to 100. Clamped to [1, 200]. */
  limit?: number;
};

/**
 * List the outgoing dependencies (jsr + npm) of a specific package version.
 */
export default async function tool(
  input: Input,
): Promise<{ version: string | null; count: number; dependencies: Dependency[] }> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
  let version: string | null = input.version ?? null;
  if (!version) {
    const pkg = await fetchJsrJson<Package>(jsrUrls.api.package(input.scope, input.name));
    version = pkg.latestVersion;
  }
  if (!version) return { version: null, count: 0, dependencies: [] };
  const deps = await fetchJsrJson<Dependency[]>(jsrUrls.api.dependencies(input.scope, input.name, version, limit));
  return { version, count: deps.length, dependencies: deps };
}
