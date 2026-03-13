import { GraphQLClient } from "graphql-request";
import { getPreferenceValues } from "@raycast/api";

const API_URL = "https://betterstacks.com/graphql";

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

// Enhanced error handling function
function handleGraphQLError(error: unknown): never {
  // Handle network errors
  if (error && typeof error === "object" && "code" in error) {
    const errorWithCode = error as { code?: string };
    if (errorWithCode.code === "ENOTFOUND") {
      throw new Error("Cannot connect to Stacks. Please check your internet connection.");
    }
    if (errorWithCode.code === "ECONNREFUSED") {
      throw new Error("Stacks service is unavailable. Please try again later.");
    }
  }

  // Handle HTTP response errors
  if (error && typeof error === "object" && "response" in error) {
    const errorWithResponse = error as {
      response?: {
        status?: number;
        errors?: Array<{ message?: string }>;
        error?: string;
      };
    };

    const status = errorWithResponse.response?.status;

    if (status === 401) {
      throw new Error("Invalid API token. Please check your token in extension preferences.");
    }
    if (status === 403) {
      throw new Error("Access denied. Your API token may not have the required permissions.");
    }
    if (status === 429) {
      throw new Error("Too many requests. Please wait a moment before trying again.");
    }
    if (status === 500) {
      throw new Error("Stacks server error. Please try again later.");
    }
    if (status && status >= 400) {
      throw new Error(`Request failed (${status}). Please try again or check your settings.`);
    }
  }

  // Handle GraphQL errors with better messages
  if (error && typeof error === "object") {
    const errorObj = error as {
      response?: {
        errors?: Array<{ message?: string }>;
      };
      message?: string;
    };

    // Extract meaningful error messages from GraphQL response
    if (errorObj.response?.errors && Array.isArray(errorObj.response.errors)) {
      const firstError = errorObj.response.errors[0];
      if (firstError?.message) {
        throw new Error(`Stacks API error: ${firstError.message}`);
      }
    }

    // Handle authentication errors specifically
    if (errorObj.message && typeof errorObj.message === "string" && errorObj.message.includes("401")) {
      throw new Error("Authentication failed. Please check your API token in extension preferences.");
    }

    // If it has a message property, use it but make it more user-friendly
    if (errorObj.message && typeof errorObj.message === "string") {
      const message = errorObj.message;
      if (message.includes("fetch")) {
        throw new Error("Failed to connect to Stacks. Please check your internet connection.");
      }
      if (message.includes("timeout")) {
        throw new Error("Request timed out. Please try again.");
      }
      // Use the original message if it's already user-friendly
      if (!message.includes("{") && !message.includes("response")) {
        throw new Error(message);
      }
    }
  }

  // Fallback for unknown errors
  throw new Error("An unexpected error occurred. Please try again or contact support.");
}

// Function to execute a GraphQL query
export async function executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  try {
    const client = getGraphQLClient();
    return await client.request<T>(query, variables);
  } catch (error: unknown) {
    handleGraphQLError(error);
  }
}

// Function to execute a GraphQL mutation
export async function executeMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
  try {
    const client = getGraphQLClient();
    return await client.request<T>(mutation, variables);
  } catch (error: unknown) {
    handleGraphQLError(error);
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
