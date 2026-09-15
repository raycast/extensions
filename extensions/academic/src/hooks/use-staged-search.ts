import { useMemo } from "react";
import { getEnabledProviders } from "../providers";
import type { AcademicSettings } from "../lib/settings";
import type { SearchProvider, SearchRequest } from "../types";
import { useFederatedSearch } from "./use-federated-search";
import { useLocalLibrarySearch } from "./use-local-library-search";
import { mergeAndRankResults } from "../lib/merge-results";

export type SearchOptions = {
  contactEmail?: string;
  googleBooksApiKey?: string;
  semanticScholarApiKey?: string;
  coreApiKey?: string;
};

export function useStagedSearch(
  input: string | SearchRequest,
  metadataProviders: SearchProvider[],
  options: SearchOptions,
  settings: AcademicSettings,
) {
  const request = typeof input === "string" ? { text: input } : input;
  const localResults = useLocalLibrarySearch(request.text);
  const accessProviders = useMemo(
    () => getEnabledProviders(settings.sources),
    [settings.sources.join(",")],
  );
  const metadataProviderKey = metadataProviders
    .map((provider) => provider.id)
    .join(",");
  const backgroundProviders = useMemo(() => {
    const metadataIds = new Set(
      metadataProviders.map((provider) => provider.id),
    );
    return accessProviders.filter((provider) => !metadataIds.has(provider.id));
  }, [
    metadataProviderKey,
    accessProviders.map((provider) => provider.id).join(","),
  ]);
  const metadataSettings = useMemo(
    () => ({
      ...settings,
      metadataSources: metadataProviders.map((provider) => provider.id),
      countries: [],
      marketplaces: [],
    }),
    [JSON.stringify(settings), metadataProviderKey],
  );
  const accessSettings = useMemo(
    () => ({
      ...settings,
      metadataSources: [],
      countries: [],
      marketplaces: [],
    }),
    [JSON.stringify(settings)],
  );
  const sourceSettings = useMemo(
    () => ({ ...settings, metadataSources: [] }),
    [JSON.stringify(settings)],
  );
  const remoteMetadata = useFederatedSearch(input, metadataProviders, {
    ...options,
    settings: metadataSettings,
  });
  const access = useFederatedSearch(input, backgroundProviders, {
    ...options,
    settings: accessSettings,
  });
  const metadata = useMemo(
    () => ({
      ...remoteMetadata,
      results: mergeAndRankResults(
        [...remoteMetadata.results, ...localResults],
        request.matchText ?? request.text,
        request.advanced,
      ),
    }),
    [
      remoteMetadata.results,
      remoteMetadata.failures,
      remoteMetadata.isLoading,
      remoteMetadata.notice,
      localResults,
      JSON.stringify(request),
    ],
  );
  return {
    metadata,
    access,
    preliminary: {
      results: [...metadata.results, ...access.results],
      failures: [...metadata.failures, ...access.failures],
      isLoading: metadata.isLoading || access.isLoading,
    },
    accessProviders,
    sourceSettings,
  };
}
