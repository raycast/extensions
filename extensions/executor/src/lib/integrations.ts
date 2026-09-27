import { useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { accountCacheKey, listIntegrations } from "./client";
import { enrichDisplayIntegrations, type BrandingIdentity, type DisplayIntegration } from "./integration-display";
import { integrationName } from "./format";
import type { Integration } from "./types";

export { integrationIcon, integrationLogoUrl, registrableDomain } from "./integration-icons";

/** Slug to integration metadata supplied by Executor. */
export type IntegrationDirectory = Map<string, DisplayIntegration>;

/**
 * Executor's own display name for an integration, e.g. `google_gmail` renders as
 * `Gmail`. Uses a readable fallback until the directory resolves.
 */
export function integrationLabel(slug: string, directory?: IntegrationDirectory): string {
  return directory?.get(slug)?.name ?? integrationName(slug);
}

// Cache namespaces below are explicit because each command minifies function names differently.
async function fetchIntegrations(_scope: string) {
  void _scope;
  return listIntegrations();
}

async function fetchBranding(scope: string, integrations: BrandingIdentity[]) {
  return { scope, integrations: await enrichDisplayIntegrations(integrations) };
}

/** Make the list usable before optional provider branding requests complete. */
export function useDisplayIntegrations() {
  const scope = accountCacheKey();
  const [integrations, setIntegrations] = useCachedState<Integration[] | undefined>(scope, undefined, {
    cacheNamespace: "executor-integration-directory",
  });
  const listing = usePromise(fetchIntegrations, [scope], {
    onData: setIntegrations,
    failureToastOptions: { title: "Could Not Load Integrations" },
  });
  const identities = useMemo(
    () =>
      (integrations ?? [])
        .map(({ slug, kind, displayUrl }) => ({ slug, kind, displayUrl }))
        .sort((a, b) => a.slug.localeCompare(b.slug)),
    [integrations],
  );
  const [branding, setBranding] = useCachedState<Awaited<ReturnType<typeof fetchBranding>> | undefined>(
    JSON.stringify([scope, identities]),
    undefined,
    { cacheNamespace: "executor-integration-branding" },
  );
  const brandingQuery = usePromise(fetchBranding, [scope, identities], {
    execute: Boolean(identities.length),
    onData: setBranding,
  });
  const data = useMemo(() => {
    if (!integrations) return undefined;
    const directory = new Map(
      (branding?.scope === scope ? branding.integrations : []).map((item) => [item.slug, item]),
    );
    return (integrations ?? []).map((item): DisplayIntegration => {
      const display = directory.get(item.slug);
      return display?.kind === item.kind && display?.displayUrl === item.displayUrl
        ? { ...item, logoDomain: display.logoDomain }
        : item;
    });
  }, [integrations, branding, scope]);
  return {
    ...listing,
    data,
    revalidate: () => Promise.all([listing.revalidate(), brandingQuery.revalidate()]),
  };
}

/** Slug lookup backed by the same progressive directory used in management views. */
export function useIntegrationDirectory(): IntegrationDirectory {
  const { data } = useDisplayIntegrations();
  return useMemo(() => new Map((data ?? []).map((integration) => [integration.slug, integration])), [data]);
}
