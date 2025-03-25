// src/api-key.ts
import { LocalStorage, showToast, Toast } from "@raycast/api";
import axios from "axios";

const API_KEY_STORAGE_KEY = "rize-io-api-key";
const GRAPHQL_ENDPOINT = "https://api.rize.io/api/v1/graphql";

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await axios.post(
      GRAPHQL_ENDPOINT,
      {
        query: `
          query ValidateUser {
            currentUser {
              name
              email
            }
          }
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    // Check for GraphQL errors
    if (response.data.errors) {
      console.error("API Key validation GraphQL errors:", response.data.errors);
      return false;
    }

    // Check if user data is returned
    const userData = response.data.data.currentUser;
    return !!userData;
  } catch (error) {
    console.error("API Key validation failed:", error);

    if (axios.isAxiosError(error)) {
      console.error("Validation error details:", {
        data: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
    }

    return false;
  }
}

export async function storeApiKey(apiKey: string): Promise<boolean> {
  try {
    // Validate the API key before storing
    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      await LocalStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      await showToast({
        style: Toast.Style.Success,
        title: "API Key Saved",
        message: "Your Rize.io API key has been securely stored",
      });
      return true;
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid API Key",
        message: "The provided API key could not be validated",
      });
      return false;
    }
  } catch (error) {
    await showFailureToast("Error Storing API Key", error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function getApiKey(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(API_KEY_STORAGE_KEY)) || null;
}

export async function clearApiKey() {
  await LocalStorage.removeItem(API_KEY_STORAGE_KEY);
  await showToast({
    style: Toast.Style.Success,
    title: "API Key Removed",
    message: "Your Rize.io API key has been cleared",
  });
}
