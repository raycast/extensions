import { GraphQLClient } from "graphql-request";
import { getPreferenceValues } from "@raycast/api";

const API_URL = "https://betterstacks.com/graphql";

export interface Preferences {
  gqlToken: string;
  viewType: "grid" | "list";
}

// Get API token from preferences
export function getApiToken(): string {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.gqlToken) {
    throw new Error("API token not found. Please configure your API token in the extension preferences.");
  }

  if (prefs.gqlToken.trim().length === 0) {
    throw new Error("API token is empty. Please provide a valid API token in the extension preferences.");
  }

  return prefs.gqlToken;
}

// Create a GraphQL client with authentication token
export function getGraphQLClient() {
  const token = getApiToken();

  return new GraphQLClient(API_URL, {
    headers: {
      "X-Authorization": token,
    },
  });
}

// Function to execute a GraphQL query
export async function executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  try {
    const client = getGraphQLClient();
    return await client.request<T>(query, variables);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "response" in error) {
      const errorWithResponse = error as { response?: { status?: number } };
      if (errorWithResponse.response?.status === 401) {
        throw new Error("Authentication failed. Please check your API token in the extension preferences.");
      }
      if (errorWithResponse.response?.status === 403) {
        throw new Error("Access denied. Your API token may not have the required permissions.");
      }
    }
    if (error && typeof error === "object" && "code" in error) {
      const errorWithCode = error as { code?: string };
      if (errorWithCode.code === "ENOTFOUND" || errorWithCode.code === "ECONNREFUSED") {
        throw new Error("Network error. Please check your internet connection and try again.");
      }
    }
    throw error;
  }
}

// Function to execute a GraphQL mutation
export async function executeMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
  try {
    const client = getGraphQLClient();
    return await client.request<T>(mutation, variables);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "response" in error) {
      const errorWithResponse = error as { response?: { status?: number } };
      if (errorWithResponse.response?.status === 401) {
        throw new Error("Authentication failed. Please check your API token in the extension preferences.");
      }
      if (errorWithResponse.response?.status === 403) {
        throw new Error("Access denied. Your API token may not have the required permissions.");
      }
    }
    if (error && typeof error === "object" && "code" in error) {
      const errorWithCode = error as { code?: string };
      if (errorWithCode.code === "ENOTFOUND" || errorWithCode.code === "ECONNREFUSED") {
        throw new Error("Network error. Please check your internet connection and try again.");
      }
    }
    throw error;
  }
}

// Add link mutation
export async function addLink(input: { target_url: string }) {
  const mutation = `
    mutation Add_link($input: AddLinkInput!) {
      add_link(input: $input) {
        title
        id
        target_url
        description
      }
    }
  `;

  return executeMutation<{ add_link: { title: string; id: string; target_url: string; description: string } }>(
    mutation,
    { input },
  );
}
