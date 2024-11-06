import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  outlineUrl: string;
  apiToken: string;
}

export interface Document {
  id: string;
  urlId: string;
  url: string;
  title: string;
  text: string;
  collectionId: string;
  collectionName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    name: string;
  };
  updatedBy: {
    name: string;
  };
}

export interface SearchResponseItem {
  ranking: number;
  context: string;
  document: Document;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export interface CollectionsResponse {
  data: Collection[];
  pagination: {
    offset: number;
    limit: number;
  };
}

export function useFetchCollections() {
  const { outlineUrl, apiToken } = getPreferenceValues<Preferences>();
  const collectionsUrl = `${outlineUrl}/api/collections.list`;

  return useFetch<CollectionsResponse>(collectionsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 100 }), // Adjust the limit as needed
  });
}

interface SearchResponse {
  pagination: {
    limit: number;
    offset: number;
    nextPath: string;
    total: number;
  };
  data: SearchResponseItem[];
}

export function useSearchDocuments(
  query: string,
  collectionId: string | null,
  collectionsData: CollectionsResponse | undefined,
  options?: { execute?: boolean }
) {
  const { outlineUrl, apiToken } = getPreferenceValues<Preferences>();
  const searchUrl = `${outlineUrl}/api/documents.search`;

  console.log(`Searching Outline at URL: ${searchUrl}`);
  console.log(
    `Search query: ${query}${
      collectionId
        ? ` in collection: ${collectionsData?.data.find((c) => c.id === collectionId)?.name || collectionId}`
        : ""
    }`
  );
  console.log(`Collection ID: ${collectionId}`);

  const body: { query: string; limit: number; collectionId?: string } = {
    query: query,
    limit: 100,
  };

  if (collectionId) {
    body.collectionId = collectionId;
  }

  return useFetch<SearchResponse>(searchUrl, {
    ...options,
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    onData: (data) => {
      console.log("API Response:", JSON.stringify(data, null, 2));
      // Add collection names to the documents using collectionsData
      data.data = data.data.map((item) => ({
        ...item,
        document: {
          ...item.document,
          collectionName:
            collectionsData?.data.find((c) => c.id === item.document.collectionId)?.name || "Unknown Collection",
        },
      }));
    },
    onError: (error) => {
      console.error("Error in useSearchDocuments:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: `Failed to search documents: ${error.message}`,
      });
    },
  });
}
