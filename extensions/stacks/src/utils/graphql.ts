import { GraphQLClient } from "graphql-request";
import { getPreferenceValues } from "@raycast/api";

const API_URL = "https://betterstacks.com/graphql";

interface Preferences {
  gqlToken: string;
  viewType: "grid" | "list";
}

// Get API token from preferences
export function getApiToken(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.gqlToken;
}

// Create a GraphQL client with authentication token
export function getGraphQLClient() {
  const token = getApiToken();

  if (!token) {
    throw new Error("API token not found. Please configure your token in extension preferences.");
  }

  return new GraphQLClient(API_URL, {
    headers: {
      "X-Authorization": token,
    },
  });
}

// Function to execute a GraphQL query
export async function executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const client = getGraphQLClient();
  return client.request<T>(query, variables);
}

// Function to execute a GraphQL mutation
export async function executeMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
  const client = getGraphQLClient();
  return client.request<T>(mutation, variables);
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
