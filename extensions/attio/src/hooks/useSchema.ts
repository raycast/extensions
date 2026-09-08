import { useCachedPromise } from "@raycast/utils";
import { listAttributes, listObjects } from "../api/endpoints";
import { missingScopes } from "../api/operations";
import type { Attribute } from "../api/types";
import { cacheNs, useSelf } from "./useSelf";

/**
 * Objects + attributes cache (spec §7): every record view needs titles and
 * labels; the schema changes rarely. Keyed by token fingerprint.
 */
export function useSchema() {
  const self = useSelf();
  const ready = self.isActive === true && missingScopes(self.granted, "listObjects").length === 0;

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (_fp: string) => {
      const { data: objects } = await listObjects();
      const filteredObjects = objects.filter(
        (o): o is (typeof objects)[number] & { api_slug: string } => o.api_slug !== null,
      );
      const entries = await Promise.all(
        filteredObjects.map(async (o) => [o.api_slug, (await listAttributes(o.api_slug)).data] as const),
      );
      return { objects: filteredObjects, attributes: Object.fromEntries(entries) as Record<string, Attribute[]> };
    },
    [cacheNs],
    { execute: ready },
  );

  return {
    objects: data?.objects ?? [],
    attributesFor: (slug: string): Attribute[] | undefined => data?.attributes[slug],
    isLoading,
    error,
    revalidate: () => {
      if (ready) revalidate();
    },
  };
}
