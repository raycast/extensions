import type { ApiResults, Package, VersionPackage } from "@/types";

import { fetchJsrJson, fetchJsrText } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
  /** Optional version. Defaults to the package's latest version. */
  version?: string;
};

/**
 * Fetch the README markdown for a JSR package version. Returns null when the
 * package's documentation is generated from JSDoc (no real README.md file ships).
 */
export default async function tool(
  input: Input,
): Promise<{ markdown: string | null; version: string | null; readmeSource: string | null }> {
  let version: string | null = input.version ?? null;
  let readmeSource: string | null = null;

  if (!version) {
    const pkg = await fetchJsrJson<Package>(jsrUrls.api.package(input.scope, input.name));
    version = pkg.latestVersion;
    readmeSource = pkg.readmeSource;
    if (pkg.readmeSource !== "readme") {
      return { markdown: null, version, readmeSource };
    }
  }

  if (!version) return { markdown: null, version: null, readmeSource };

  const versionsData = await fetchJsrJson<ApiResults<VersionPackage> | VersionPackage[]>(
    jsrUrls.api.versions(input.scope, input.name),
  );
  const versions = Array.isArray(versionsData) ? versionsData : (versionsData.items ?? []);
  const readmePath = versions.find((v) => v.version === version)?.readmePath ?? "/README.md";

  const markdown = await fetchJsrText(jsrUrls.site.readme(input.scope, input.name, version, readmePath));
  return { markdown, version, readmeSource };
}
