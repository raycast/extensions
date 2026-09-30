import { useMemo } from "react";
import { showFailureToast, useFetch } from "@raycast/utils";
import type { JustWatchMedia } from "@/types";
import { parseItems } from "@/utils/data";

const GraphQLDocument = `
query GetSuggestedTitles(
  $country: Country!
  $language: Language!
  $first: Int!
  $filter: TitleFilter
) {
  popularTitles(country: $country, first: $first, filter: $filter) {
    edges {
      node {
        ...SuggestedTitle
        ... on MovieOrShowOrSeason {
          objectType
          objectId
          offerCount(country: $country, platform: WEB)
          offers(country: $country, platform: WEB) {
            monetizationType
            elementCount
            retailPriceValue
            retailPrice(language: $language)
            currency
            standardWebURL
            deeplinkURL(platform: WEB)
            presentationType
            package {
              id
              packageId
              clearName
              icon
            }
          }
        }
      }
    }
  }
}

fragment SuggestedTitle on MovieOrShow {
  id
  objectType
  objectId
  content(country: $country, language: $language) {
    fullPath
    title
    originalReleaseYear
    posterUrl
    externalIds {
      imdbId
    }
    scoring {
      imdbScore
      imdbVotes
      tmdbPopularity
      tmdbScore
    }
  }
}
`;

const useGraphQL = (
  document: string,
  operationName: string,
  variables: Record<string, unknown>,
  execute: boolean = true,
) => {
  return useFetch("https://apis.justwatch.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: document,
      operationName,
      variables,
    }),
    execute,
    async parseResponse(response) {
      return response.json().then((data) => {
        if (data.errors) {
          throw new Error(data.errors[0].message);
        }
        if (data.data?.popularTitles?.edges) {
          return data.data.popularTitles.edges.map((edge: { node: JustWatchMedia }) => edge.node);
        }
        return [];
      });
    },
    onError: async (error) => {
      await showFailureToast(error, { message: "There was an error showing results for this search query." });
    },
  });
};

const useSuggestedTitles = (countryCode: string | null, search: string, execute: boolean = true) => {
  const { language, country } = useMemo(() => {
    const [language, country] = (countryCode || "").split("_");
    return { language, country };
  }, [countryCode]);

  const { data, isLoading, error, revalidate } = useGraphQL(
    GraphQLDocument,
    "GetSuggestedTitles",
    {
      country,
      language,
      first: 12,
      filter: { searchQuery: search },
    },
    execute && search.length > 0 && countryCode !== null,
  );

  const revalidateIf = () => {
    if (execute && search.length > 0) {
      revalidate();
    }
  };

  return { suggestedTitles: data, isLoading, error, revalidate: revalidateIf };
};

export const useSearchMedias = (query: string, countryCode: string | null, execute: boolean) => {
  const { suggestedTitles, ...rest } = useSuggestedTitles(
    countryCode,
    query,
    execute && query.length > 0 && countryCode !== null,
  );

  return { data: parseItems(suggestedTitles || []), ...rest };
};
