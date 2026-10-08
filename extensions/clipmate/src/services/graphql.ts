import { ApolloClient, InMemoryCache, gql, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import fetch from "node-fetch";
import { getApiKey } from "../auth";
import { secureStorage } from "../lib/security";
import {
  Collection,
  CreateCollectionInput,
  AddLinkInput,
  Folder,
  LinkResponse,
  CreateFolderInput,
  Limits,
} from "../types";

// GraphQL API URL
const GRAPHQL_API_URL = "https://api0.clipmate.ai/graphql";

// Create HTTP link with node-fetch
const httpLink = new HttpLink({
  uri: GRAPHQL_API_URL,
  // @ts-expect-error - node-fetch is compatible but has a different type
  fetch: fetch,
});

// Error handling link to clear invalid API keys and handle 401 errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (networkError) {
    // Check for 401 Unauthorized errors
    if ("statusCode" in networkError && networkError.statusCode === 401) {
      console.log("API key is invalid (401 error), clearing storage and triggering re-authentication...");
      // Clear all authentication data securely
      secureStorage
        .clearAll()
        .then(() => {
          console.log("Authentication data cleared due to 401 error");
          // Note: In Raycast, we can't automatically reload the extension
          // The user will need to restart the command, which will trigger the login flow
        })
        .catch((error) => {
          console.error("Error clearing storage after 401:", error);
        });

      // Don't retry the operation since the API key is invalid
      return;
    }

    // For network errors that aren't 401, log them but don't clear auth
    console.error("Network error:", networkError);
  }

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`);
    });
  }
});

// Create auth link that adds the API key to requests
const authLink = setContext(async (_, { headers }) => {
  const apiKey = await getApiKey();
  return {
    headers: {
      ...headers,
      "X-API-Key": apiKey || "",
      "X-Platform": "raycast",
    },
  };
});

// Create Apollo Client with error handling
export const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
});

// GraphQL Queries and Mutations
const COLLECTIONS_QUERY = gql`
  {
    collections {
      collectionId
      description
      isPublic
      itemCount
      name
      parentFolderId
      shortId
    }
  }
`;

const FOLDERS_QUERY = gql`
  {
    folders {
      collectionIds
      folderId
      isPublic
      name
      parentFolderId
      shortId
      userId
    }
  }
`;

const LIMITS_QUERY = gql`
  {
    limits {
      monthlyAvailable
      monthlyLimit
      monthlyUsed
    }
  }
`;

const CREATE_FOLDER_MUTATION = gql`
  mutation CreateFolder($name: String!) {
    folderCreate(name: $name) {
      collectionIds
      folderId
      isPublic
      name
      parentFolderId
      shortId
      userId
    }
  }
`;

const UPDATE_FOLDER_MUTATION = gql`
  mutation UpdateFolder($folderId: String!, $name: String, $isPublic: Boolean) {
    folderUpdate(folderId: $folderId, name: $name, isPublic: $isPublic) {
      collectionIds
      folderId
      isPublic
      name
      parentFolderId
      shortId
      userId
    }
  }
`;

const DELETE_FOLDER_MUTATION = gql`
  mutation DeleteFolder($folderId: String!) {
    folderDelete(folderId: $folderId)
  }
`;

const CREATE_COLLECTION_MUTATION = gql`
  mutation CreateCollection($name: String!, $description: String, $isPublic: Boolean, $parentFolderId: String) {
    collectionCreate(name: $name, description: $description, isPublic: $isPublic, parentFolderId: $parentFolderId) {
      collectionId
      description
      name
      isPublic
      itemCount
      parentFolderId
    }
  }
`;

const ADD_LINK_MUTATION = gql`
  mutation AddLink($url: String!, $title: String, $image: String, $description: String) {
    linkAdd(url: $url, title: $title, image: $image, description: $description) {
      data
      type
      itemId
      authors
      userId
    }
  }
`;

const ADD_ITEMS_TO_COLLECTION = gql`
  mutation AddItemsToCollection($collectionIds: [String!]!, $itemIds: [String!]!) {
    collectionAddItems(collectionIds: $collectionIds, itemIds: $itemIds)
  }
`;

// API Key Operations
const DELETE_API_KEY_MUTATION = gql`
  mutation DeleteApiKey($key: String!, $keyId: String!) {
    keyDelete(key: $key, keyId: $keyId)
  }
`;

// Collection Operations
export async function fetchCollections(): Promise<Collection[]> {
  try {
    const { data } = await client.query({
      query: COLLECTIONS_QUERY,
      fetchPolicy: "network-only",
    });
    return data.collections;
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw error;
  }
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  try {
    const { data } = await client.mutate({
      mutation: CREATE_COLLECTION_MUTATION,
      variables: {
        name: input.name,
        description: input.description || "",
        isPublic: input.isPublic !== undefined ? input.isPublic : false,
        parentFolderId: input.parentFolderId,
      },
      refetchQueries: [{ query: COLLECTIONS_QUERY }],
      awaitRefetchQueries: true,
    });
    return data.collectionCreate;
  } catch (error) {
    console.error("Error creating collection:", error);
    throw error;
  }
}

// Link Operations
export async function addLink(input: AddLinkInput): Promise<LinkResponse> {
  try {
    // Check limits before adding link
    const limits = await fetchLimits();
    if (isFreeAccount(limits) && hasReachedLimit(limits)) {
      throw new LimitExceededError(limits);
    }

    const { data } = await client.mutate({
      mutation: ADD_LINK_MUTATION,
      variables: {
        url: input.url,
        title: input.title,
        image: input.image,
        description: input.description,
      },
    });

    if (!data.linkAdd || !data.linkAdd.itemId) {
      throw new Error("Failed to add link");
    }

    // If a collection ID is provided, add the link to that collection
    if (input.collectionId) {
      await client.mutate({
        mutation: ADD_ITEMS_TO_COLLECTION,
        variables: {
          collectionIds: [input.collectionId],
          itemIds: [data.linkAdd.itemId],
        },
      });
    }

    return data.linkAdd;
  } catch (error) {
    console.error("Error adding link:", error);
    throw error;
  }
}

// Folder Operations
export async function fetchFolders(): Promise<Folder[]> {
  try {
    const { data } = await client.query({
      query: FOLDERS_QUERY,
      fetchPolicy: "network-only",
    });
    return data.folders;
  } catch (error) {
    console.error("Error fetching folders:", error);
    throw error;
  }
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  try {
    const { data } = await client.mutate({
      mutation: CREATE_FOLDER_MUTATION,
      variables: {
        name: input.name,
      },
      refetchQueries: [{ query: FOLDERS_QUERY }],
      awaitRefetchQueries: true,
    });
    return data.folderCreate;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw error;
  }
}

export async function updateFolder(folderId: string, input: { name?: string; isPublic?: boolean }): Promise<Folder> {
  try {
    const { data } = await client.mutate({
      mutation: UPDATE_FOLDER_MUTATION,
      variables: {
        folderId,
        ...input,
      },
      refetchQueries: [{ query: FOLDERS_QUERY }],
      awaitRefetchQueries: true,
    });
    return data.folderUpdate;
  } catch (error) {
    console.error("Error updating folder:", error);
    throw error;
  }
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  try {
    const { data } = await client.mutate({
      mutation: DELETE_FOLDER_MUTATION,
      variables: { folderId },
      refetchQueries: [{ query: FOLDERS_QUERY }],
      awaitRefetchQueries: true,
    });
    return data.folderDelete;
  } catch (error) {
    console.error("Error deleting folder:", error);
    throw error;
  }
}

// Limits Operations
export async function fetchLimits(): Promise<Limits> {
  try {
    const { data } = await client.query({
      query: LIMITS_QUERY,
      fetchPolicy: "network-only",
    });
    return data.limits;
  } catch (error) {
    console.error("Error fetching limits:", error);
    throw error;
  }
}

export function isFreeAccount(limits: Limits): boolean {
  // Free accounts have non-null monthlyLimit and monthlyAvailable
  return limits.monthlyLimit !== null && limits.monthlyAvailable !== null;
}

export function hasReachedLimit(limits: Limits): boolean {
  if (!isFreeAccount(limits)) {
    return false; // Pro/Essential accounts don't have limits
  }

  // Check if user has reached their monthly limit
  return (
    (limits.monthlyAvailable !== null && limits.monthlyAvailable <= 0) ||
    (limits.monthlyUsed !== null && limits.monthlyLimit !== null && limits.monthlyUsed >= limits.monthlyLimit)
  );
}

export class LimitExceededError extends Error {
  constructor(limits: Limits) {
    super(`You've reached your monthly limit of ${limits.monthlyLimit} links`);
    this.name = "LimitExceededError";
  }
}

// API Key Operations
export async function deleteCurrentApiKey(apiKey: string): Promise<boolean> {
  try {
    await client.mutate({
      mutation: DELETE_API_KEY_MUTATION,
      variables: {
        key: apiKey,
        keyId: "", // Empty keyId to delete by key value
      },
    });

    console.log("Successfully deleted current API key from server");
    return true;
  } catch (error) {
    console.error("Error deleting current API key from server:", error);
    return false;
  }
}
