import { AI, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { createApiClient } from "../api";
import type { AiPrompt, ItemDefinition, SuggestedDefinitionsSource, SupportedLanguage } from "../types";
import { executeAiPrompt } from "../services/ai-suggestion-service";
import { queryKeys } from "../features/shared/query-keys";

export interface LookupResult {
  source: "existing" | "blueprint" | "ai" | "not_found";
  item?: {
    id?: string | null;
    text: string;
    comment?: string | null;
    imageUrl?: string | null;
    speechUrl?: string | null;
    definitions: ItemDefinition[];
    groupIds: string[];
  };
  suggestedDefinitions?: {
    source: SuggestedDefinitionsSource;
    definitions: ItemDefinition[];
  };
}

export function useLookup(authIdentity: string, query: string, currentLanguage: SupportedLanguage) {
  const languageCode = currentLanguage.languageCode;
  const [revision, setRevision] = useState(() => queryKeys.lookup.revision(authIdentity, languageCode));
  const [aiResult, setAiResult] = useState<LookupResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingAiPrompt, setPendingAiPrompt] = useState<AiPrompt | undefined>();

  useEffect(() => {
    setRevision(queryKeys.lookup.revision(authIdentity, languageCode));
    return queryKeys.lookup.subscribeRevision(authIdentity, languageCode, setRevision);
  }, [authIdentity, languageCode]);

  useEffect(() => {
    setAiResult(null);
    setPendingAiPrompt(undefined);
  }, [query]);

  const lookupCacheKey = queryKeys.lookup.result(authIdentity, languageCode, revision, query);

  const {
    data,
    isLoading,
    revalidate: revalidateLookup,
  } = useCachedPromise(
    async (revisionToken: string, normalizedLookupCacheKey: string): Promise<LookupResult | null> => {
      void revisionToken;
      if (!query || query.length < 2 || !languageCode) {
        return null;
      }

      const client = createApiClient();
      const localAiAvailable = environment.canAccess(AI);
      const response = await client.lookup.lookup(languageCode, query, {
        localAi: localAiAvailable,
      });

      setPendingAiPrompt(response.aiPrompt ?? undefined);

      void normalizedLookupCacheKey;
      return {
        source: response.source,
        item: response.item ?? undefined,
        suggestedDefinitions: response.suggestedDefinitions ?? undefined,
      };
    },
    [revision, lookupCacheKey],
    {
      execute: query.length >= 2 && !!languageCode,
      keepPreviousData: false,
    },
  );

  const triggerAi = useCallback(async () => {
    const aiPrompt = pendingAiPrompt;
    if (!aiPrompt) return;

    setAiLoading(true);
    try {
      const aiSuggestion = await executeAiPrompt(aiPrompt);
      if (aiSuggestion?.definitions?.length) {
        if (data?.item) {
          setAiResult({
            source: data.source,
            item: data.item,
            suggestedDefinitions: {
              source: "ai",
              definitions: aiSuggestion.definitions,
            },
          });
        } else {
          setAiResult({
            source: "ai",
            item: {
              text: aiSuggestion.text,
              comment: aiSuggestion.comment ?? null,
              definitions: aiSuggestion.definitions,
              groupIds: aiSuggestion.groupIds ?? [],
            },
          });
        }
      }
    } finally {
      setAiLoading(false);
    }
  }, [data]);

  const revalidate = () => {
    setAiResult(null);
    setPendingAiPrompt(undefined);
    const currentRevision = queryKeys.lookup.revision(authIdentity, languageCode);

    if (currentRevision !== revision) {
      setRevision(currentRevision);
      return;
    }

    return revalidateLookup();
  };

  return {
    data: aiResult ?? data,
    isLoading,
    aiLoading,
    canTriggerAi: !!pendingAiPrompt && !aiResult,
    triggerAi,
    revalidate,
  };
}
