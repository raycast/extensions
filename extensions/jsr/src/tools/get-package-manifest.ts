import type { Package, VersionMeta } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
  /** Version. Defaults to the package's latest version. */
  version?: string;
};

type ManifestSummary = {
  version: string;
  fileCount: number;
  totalBytes: number;
  entryPoints: number;
  exports: Record<string, string>;
};

/**
 * Fetch the per-version manifest for a JSR package: total bundled bytes,
 * file count, and the `exports` map (public entry points).
 */
export default async function tool(input: Input): Promise<ManifestSummary | null> {
  let version: string | null = input.version ?? null;
  if (!version) {
    const pkg = await fetchJsrJson<Package>(jsrUrls.api.package(input.scope, input.name));
    version = pkg.latestVersion;
  }
  if (!version) return null;

  const meta = await fetchJsrJson<VersionMeta>(jsrUrls.site.versionMeta(input.scope, input.name, version));
  const files = Object.values(meta.manifest);
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  return {
    version,
    fileCount: files.length,
    totalBytes,
    entryPoints: Object.keys(meta.exports).length,
    exports: meta.exports,
  };
}
