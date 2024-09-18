import fetch from "node-fetch";
import { JustWatchMedia } from "./types";
import { showToast, Toast } from "@raycast/api";

export class GraphQL {
  async query(document: string, operationName: string, variables: any): Promise<any> {
    const GRAPHQL_URL = "https://apis.justwatch.com/graphql";

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: document,
        operationName: operationName,
        variables: variables,
      }),
    });

    const responseBody: any = await response.json();

    if (responseBody.errors || !response.ok) {
      await showToast(
        Toast.Style.Failure,
        "Couldn't get results",
        "There was an error showing results for this search query."
      );
      return [];
    }

    return responseBody.data;
  }

  async getSuggestedTitles(country: string, search: string): Promise<JustWatchMedia[]> {
    const document = `
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
            fullPath
            scoring {
              imdbScore
              imdbVotes
              tmdbPopularity
              tmdbScore
            }
          }
        }
        `;

    // country in format "en_US"
    // extract language and country
    const language = country.split("_")[0];
    country = country.split("_")[1];

    const result = await this.query(document, "GetSuggestedTitles", {
      country,
      language,
      first: 12,
      filter: { searchQuery: search },
    });

    // in format { popularTitles: { edges: [ { node: { ... } } ] } }
    // need to extract the node from each edge and return it
    const medias: Array<JustWatchMedia> = [];
    result.popularTitles.edges.forEach((edge: any) => {
      medias.push(edge.node);
    });

    return medias;
  }
}
