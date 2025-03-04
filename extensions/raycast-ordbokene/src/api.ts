import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { ArticleLookupResponse, ArticleResponse, ArticleData, Preferences, Suggestion } from "./types";

const BASE_URL = "https://oda.uib.no/opal/prod";

export function useSuggestions(query: string, preferences: Preferences) {
  const params = new URLSearchParams({
    q: query,
    include: "ei",
    dform: "int",
  });

  const dictValues = [];
  if (preferences.includeBokmal) dictValues.push("bm");
  if (preferences.includeNynorsk) dictValues.push("nn");

  let url = `${BASE_URL}/api/suggest?${params.toString()}`;
  if (dictValues.length > 0) {
    url += `&dict=${dictValues.join(",")}`;
  }

  return useFetch<Suggestion[]>(url, {
    execute: query.length >= 2,
    onError: async (error) => {
      console.error("Error fetching suggestions:", error, "Query:", query);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch suggestions",
        message: "Please check your search term and try again",
      });
    },
    headers: {
      Accept: "application/json",
    },
    parseResponse: async (response) => {
      if (!response.ok) {
        console.error("Response not ok:", response.status, await response.text());
        throw new Error(`API Error: ${response.status}`);
      }
      const data = await response.json();

      const suggestions: Suggestion[] = [
        ...(data.a?.exact?.map((item: [string, number]) => ({
          id: `exact-${item[0]}`,
          w: item[0],
          dict: item[1],
        })) || []),
        ...(data.a?.inflect?.map((item: [string, number]) => ({
          id: `inflect-${item[0]}`,
          w: item[0],
          dict: item[1],
        })) || []),
      ];

      return suggestions;
    },
  });
}

export function useArticle(
  word: string,
  dict: 1 | 2 | 3
): {
  data: ArticleData;
  isLoading: boolean;
  ids: {
    bm: number[];
    nn: number[];
  };
} {
  const { data: lookupData, isLoading: isLookingUp } = useFetch<ArticleLookupResponse>(
    `${BASE_URL}/api/articles?w=${encodeURIComponent(word)}&dict=${
      dict === 1 ? "bm" : dict === 2 ? "nn" : "bm,nn"
    }&scope=ei`,
    {
      execute: !!word,
      headers: {
        Accept: "application/json",
      },
      parseResponse: async (response) => {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Lookup failed: ${response.status} - ${text}`);
        }
        return JSON.parse(text);
      },
      onError: async (error) => {
        console.error("Error looking up article:", error, "Word:", word);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to lookup article",
          message: "Could not find article IDs",
        });
      },
    }
  );

  const bmIds = lookupData?.articles.bm || [];
  const nnIds = lookupData?.articles.nn || [];

  const { data: bmArticles, isLoading: isLoadingBm } = useFetch<ArticleResponse[]>(
    `${BASE_URL}/bm/article/${bmIds[0]}.json`,
    {
      execute: bmIds.length > 0 && dict !== 2,
      headers: {
        Accept: "application/json",
      },
      parseResponse: async (response) => {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`BM articles failed: ${response.status} - ${text}`);
        }
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
      },
      onError: async (error) => {
        console.error("Error fetching BM articles:", error, "IDs:", bmIds);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch Bokmål articles",
          message: "Could not load article details",
        });
      },
    }
  );

  const { data: nnArticles, isLoading: isLoadingNn } = useFetch<ArticleResponse[]>(
    `${BASE_URL}/nn/article/${nnIds[0]}.json`,
    {
      execute: nnIds.length > 0 && dict !== 1,
      headers: {
        Accept: "application/json",
      },
      parseResponse: async (response) => {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`NN articles failed: ${response.status} - ${text}`);
        }
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
      },
      onError: async (error) => {
        console.error("Error fetching NN articles:", error, "IDs:", nnIds);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch Nynorsk articles",
          message: "Could not load article details",
        });
      },
    }
  );

  return {
    data: {
      bm: bmArticles,
      nn: nnArticles,
    },
    isLoading: isLookingUp || isLoadingBm || isLoadingNn,
    ids: {
      bm: bmIds,
      nn: nnIds,
    },
  };
}
