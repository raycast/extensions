import { GraphQLClient } from "graphql-request";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

const API_URL = "https://betterstacks.com/graphql";

interface Preferences {
  gqlToken?: string;
}

// Get API token from preferences or localStorage
export async function getApiToken(): Promise<string | null> {
  // First check preferences (for backward compatibility)
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.gqlToken) {
    return prefs.gqlToken;
  }

  // Then check LocalStorage
  const storedToken = await LocalStorage.getItem("stacks-gql-token");
  return storedToken ? String(storedToken) : null;
}

// Save token to LocalStorage
export async function saveApiToken(token: string): Promise<void> {
  await LocalStorage.setItem("stacks-gql-token", token);
}

// Create a GraphQL client with authentication token
export async function getGraphQLClient() {
  const token = await getApiToken();

  if (!token) {
    throw new Error("API token not found. Please set up your Stacks token first.");
  }

  return new GraphQLClient(API_URL, {
    headers: {
      "X-Authorization": token,
    },
  });
}

// Function to execute a GraphQL query
export async function executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const client = await getGraphQLClient();
  return client.request<T>(query, variables);
}

// Function to execute a GraphQL mutation
export async function executeMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
  const client = await getGraphQLClient();
  return client.request<T>(mutation, variables);
}
