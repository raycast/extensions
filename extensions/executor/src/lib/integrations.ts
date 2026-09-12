import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { accountCacheKey, listIntegrations } from "./client";
import { integrationName } from "./format";
import type { Integration } from "./types";

export { integrationIcon, integrationLogoUrl, registrableDomain } from "./integration-icons";

/** Slug to integration metadata supplied by Executor. */
export type IntegrationDirectory = Map<string, Integration>;

/**
 * Executor's own display name for an integration, e.g. `google_gmail` renders as
 * `Gmail`. Falls back to the local brand map until the directory resolves, so
 * the first paint is never a raw slug.
 */
export function integrationLabel(slug: string, directory?: IntegrationDirectory): string {
  return directory?.get(slug)?.name ?? integrationName(slug);
}

/**
 * Loads the integration directory. Cached, because it is a small response that
 * every view wants and it changes only when an integration is added or removed.
 */
export function useIntegrationDirectory(): IntegrationDirectory {
  const { data } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listIntegrations();
    },
    [accountCacheKey()],
    {
      initialData: [] as Integration[],
      failureToastOptions: { title: "Could Not Load Integrations" },
    },
  );

  return useMemo(() => new Map((data ?? []).map((integration) => [integration.slug, integration])), [data]);
}
