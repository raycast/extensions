import { useMemo } from "react";
import { getEnabledProviders } from "../providers";
import type { AcademicSettings } from "../lib/settings";
import type { SearchProvider, SearchRequest } from "../types";
import { useFederatedSearch } from "./use-federated-search";
import { useLocalLibrarySearch } from "./use-local-library-search";
import type { FileFormat } from "../types";
import { combineStagedResults } from "../lib/staged-results";

const ALL_FILE_FORMATS: FileFormat[] = [
  "pdf",
  "tex",
  "doc",
  "txt",
  "epub",
  "html",
  "djvu",
  "rtf",
  "xml",
  "mobi",
  "unknown",
];

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
  const discoveryRequest = useMemo(
    () => ({
      ...request,
      advanced: request.advanced
        ? {
            ...request.advanced,
            openAccessOnly: false,
            withAcceptedFilesOnly: false,
          }
        : undefined,
    }),
    [JSON.stringify(request)],
  );
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
      languages: [],
      includeUnknownLanguage: true,
      showWorksWithoutAcceptedFiles: true,
      hideLowConfidenceResults: false,
      formats: ALL_FILE_FORMATS,
    }),
    [JSON.stringify(settings), metadataProviderKey],
  );
  const accessSettings = useMemo(
    () => ({
      ...settings,
      metadataSources: [],
      countries: [],
      marketplaces: [],
      languages: [],
      includeUnknownLanguage: true,
      showWorksWithoutAcceptedFiles: true,
      hideLowConfidenceResults: false,
      formats: ALL_FILE_FORMATS,
    }),
    [JSON.stringify(settings)],
  );
  const sourceSettings = useMemo(
    () => ({ ...settings, metadataSources: [] }),
    [JSON.stringify(settings)],
  );
  const remoteMetadata = useFederatedSearch(
    discoveryRequest,
    metadataProviders,
    {
      ...options,
      settings: metadataSettings,
    },
  );
  const access = useFederatedSearch(discoveryRequest, backgroundProviders, {
    ...options,
    settings: accessSettings,
  });
  const metadata = useMemo(() => {
    const final = !remoteMetadata.isLoading && !access.isLoading;
    const processed = combineStagedResults(
      remoteMetadata.results,
      access.results,
      localResults,
      request,
      settings,
      final,
    );
    const waitsForAccess = Boolean(
      request.advanced?.openAccessOnly ||
      request.advanced?.withAcceptedFilesOnly ||
      !settings.showWorksWithoutAcceptedFiles,
    );
    return {
      ...remoteMetadata,
      ...processed,
      isLoading:
        remoteMetadata.isLoading || (waitsForAccess && access.isLoading),
    };
  }, [
    remoteMetadata.results,
    remoteMetadata.failures,
    remoteMetadata.isLoading,
    remoteMetadata.notice,
    access.results,
    access.isLoading,
    localResults,
    JSON.stringify(request),
    JSON.stringify(settings),
  ]);
  return {
    metadata,
    access,
    preliminary: {
      results: metadata.results,
      failures: [...metadata.failures, ...access.failures],
      isLoading: metadata.isLoading || access.isLoading,
    },
    accessProviders,
    sourceSettings,
  };
}
