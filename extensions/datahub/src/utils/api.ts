import fetch from "node-fetch";
import { DATAHUB_FRONTEND, DATAHUB_GMS_GRAPHQL_ENDPOINT } from "./constants";
import { showFailureToast } from "@raycast/utils";

export interface DatasetEntity {
  urn: string;
  type: string;
  name: string;
  platform: {
    name: string;
  };
}

export interface SearchResult {
  entity: DatasetEntity;
}

export interface SearchResponse {
  data: {
    search: {
      searchResults: SearchResult[];
    };
  };
}

export const getUrlForDataset = (urn: string): string => {
  return `${DATAHUB_FRONTEND}/dataset/${encodeURIComponent(urn)}`;
};

export const searchGraphForEntity = async (entityName: string): Promise<SearchResult[]> => {
  const query = `
    {
      search(input: {
        type: DATASET,
        query: "${entityName.replace(/"/g, '"')}",
        start: 0,
        count: 100
      }) {
        searchResults {
          entity {
            urn
            type
            ...on Dataset {
              name,
              platform {name}
            }
          }
        }
      }
    }
  `;

  const payload = {
    query: query,
  };

  try {
    const response = await fetch(DATAHUB_GMS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data: SearchResponse = await response.json();
    return data.data.search.searchResults || [];
  } catch (error) {
    showFailureToast(error, {
      title: "Error searching Datahub",
      message: String(error),
    });
    return [];
  }
};
