import type { NameAndScope, Package } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Reserved — leave undefined. The stats endpoint takes no parameters. */
  filter?: string;
};

type RawStats = {
  newest: NameAndScope[];
  featured: NameAndScope[];
};

const enrich = async (items: NameAndScope[]): Promise<Package[]> => {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        return await fetchJsrJson<Package>(jsrUrls.api.package(item.scope, item.name));
      } catch {
        return null;
      }
    }),
  );
  return results.filter((p): p is Package => p !== null);
};

/**
 * Fetch the JSR landing-page stats: featured and newest packages, enriched with full metadata.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function tool(_input: Input): Promise<{ newest: Package[]; featured: Package[] }> {
  const raw = await fetchJsrJson<RawStats>(jsrUrls.api.stats());
  const [newest, featured] = await Promise.all([enrich(raw.newest ?? []), enrich(raw.featured ?? [])]);
  return { newest, featured };
}
