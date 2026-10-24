import { useEffect, useState } from "react";
import { mergeAndRankResults } from "../lib/merge-results";
import { processResults } from "../lib/result-processing";
import type { AcademicSettings } from "../lib/settings";
import type {
  ProviderFailure,
  SearchProvider,
  SearchRequest,
  WorkResult,
} from "../types";
import { recordSearch } from "../lib/library";
import {
  searchProviderWithFallback,
  uniqueQueries,
} from "../lib/provider-search";

type SearchState = {
  results: WorkResult[];
  failures: ProviderFailure[];
  isLoading: boolean;
  notice?: string;
};

const EMPTY_STATE: SearchState = {
  results: [],
  failures: [],
  isLoading: false,
};
const CACHE = new Map<string, { state: SearchState; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function useFederatedSearch(
  input: string | SearchRequest,
  providers: SearchProvider[],
  options: {
    contactEmail?: string;
    googleBooksApiKey?: string;
    semanticScholarApiKey?: string;
    coreApiKey?: string;
    settings?: AcademicSettings;
  },
): SearchState {
  const [state, setState] = useState<SearchState>(EMPTY_STATE);
  const providerKey = providers.map((provider) => provider.id).join(",");

  useEffect(() => {
    const request: SearchRequest =
      typeof input === "string" ? { text: input } : input;
    const trimmed = request.text.trim();
    const matchText = request.matchText?.trim() || trimmed;
    if (trimmed.length < 2) {
      setState(EMPTY_STATE);
      return;
    }
    const cacheKey = JSON.stringify({
      request,
      providers: providerKey,
      settings: options.settings,
    });
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setState(cached.state);
      return;
    }

    const controller = new AbortController();
    let disposed = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      const collectedResults: WorkResult[] = [];
      const collectedFailures: ProviderFailure[] = [];
      const pendingProviders = new Set(
        providers.map((provider) => provider.name),
      );
      let remaining = providers.length;

      setState({ results: [], failures: [], isLoading: remaining > 0 });
      deadline = setTimeout(() => {
        if (disposed || remaining === 0) return;
        const timedOut = [...pendingProviders].map((provider) => ({
          provider,
          message: "Search exceeded 10 seconds",
        }));
        controller.abort(new Error("Federated search deadline exceeded"));
        const completedState: SearchState = {
          ...processResults(
            mergeAndRankResults(collectedResults, matchText, request.advanced),
            request,
            options.settings ?? fallbackSettings(),
            true,
          ),
          failures: [...collectedFailures, ...timedOut],
          isLoading: false,
        };
        CACHE.set(cacheKey, {
          state: completedState,
          expiresAt: Date.now() + CACHE_TTL,
        });
        void recordSearch(request);
        setState(completedState);
      }, 10_000);

      for (const provider of providers) {
        const context = {
          signal: controller.signal,
          contactEmail: options.contactEmail,
          googleBooksApiKey: options.googleBooksApiKey,
          semanticScholarApiKey: options.semanticScholarApiKey,
          coreApiKey: options.coreApiKey,
          advanced: request.advanced,
          fallbackQueries: uniqueQueries(request.fallbackTexts ?? [], trimmed),
        };
        void searchProviderWithFallback(provider, trimmed, context)
          .then((results) => {
            if (disposed || controller.signal.aborted) return;
            const canSupplyAccess = options.settings
              ? options.settings.sources.includes(provider.id)
              : true;
            const canSupplyMetadata = options.settings
              ? options.settings.metadataSources.includes(provider.id)
              : true;
            collectedResults.push(
              ...results.map((result) => ({
                ...result,
                providerId: provider.id,
                metadataEligible: canSupplyMetadata,
                metadataSources: canSupplyMetadata ? result.sources : [],
                accessSources: canSupplyAccess ? result.sources : [],
                accessLinks: canSupplyAccess ? result.accessLinks : [],
              })),
            );
          })
          .catch((error: unknown) => {
            if (disposed || controller.signal.aborted) return;
            collectedFailures.push({
              provider: provider.name,
              message: error instanceof Error ? error.message : String(error),
            });
          })
          .finally(() => {
            pendingProviders.delete(provider.name);
            remaining -= 1;
            if (disposed || controller.signal.aborted) return;
            if (remaining === 0 && deadline) clearTimeout(deadline);
            const final = remaining === 0;
            const nextState: SearchState = {
              ...processResults(
                mergeAndRankResults(
                  collectedResults,
                  matchText,
                  request.advanced,
                ),
                request,
                options.settings ?? fallbackSettings(),
                final,
              ),
              failures: [...collectedFailures],
              isLoading: remaining > 0,
            };
            if (final) {
              CACHE.set(cacheKey, {
                state: nextState,
                expiresAt: Date.now() + CACHE_TTL,
              });
              void recordSearch(request);
            }
            setState(nextState);
          });
      }
    }, 250);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (deadline) clearTimeout(deadline);
      controller.abort();
    };
  }, [
    typeof input === "string" ? input : JSON.stringify(input),
    providerKey,
    options.contactEmail,
    options.googleBooksApiKey,
    options.semanticScholarApiKey,
    options.coreApiKey,
    options.settings ? JSON.stringify(options.settings) : "",
  ]);

  return state;
}

function fallbackSettings(): AcademicSettings {
  return {
    sources: [],
    metadataSources: [],
    encyclopediaSources: [],
    languages: [],
    countries: [],
    marketplaces: [],
    formats: ["pdf", "tex", "doc", "txt"],
    includeUnknownLanguage: true,
    showWorksWithoutAcceptedFiles: true,
    hideLowConfidenceResults: false,
    showUnavailableSources: false,
    defaultCitationStyle: "abnt",
    localFolders: [],
    enableExperimentalAnalysis: false,
    analysisEngine: "local",
    allowExternalAnalysis: false,
    ollamaBaseUrl: "http://127.0.0.1:11434",
    ollamaModel: "qwen3:4b",
    ollamaEmbeddingModel: "embeddinggemma",
    renameMode: "suggest",
    articleRenameTemplate: "{author} - {year} - {type} - {title} - {journal}",
    bookRenameTemplate: "{author} - {year} - {type} - {title} - {publisher}",
    otherRenameTemplate: "{author} - {year} - {type} - {title}",
    documentsPerRun: 3,
    pauseOnBattery: true,
  };
}
