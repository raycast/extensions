import { showToast, Toast } from "@raycast/api";
import { Secret, SecretRequest } from "../types";
import { apiClient, handleApiError } from "./api-client";
import { validateConfig } from "./config";

/**
 * Load secrets with error handling and validation
 */
export async function loadSecrets(): Promise<Secret[]> {
  if (!validateConfig()) {
    await showFailureToast(new Error("Please configure your API keys in preferences"), {
      title: "Configuration Error"
    });
    return [];
  }

  try {
    const response = await apiClient.listSecrets();
    return response.data;
  } catch (error) {
    await handleApiError(error, "Failed to load secrets");
    return [];
  }
}

/**
 * Load secret requests with error handling and validation
 */
export async function loadSecretRequests(): Promise<SecretRequest[]> {
  if (!validateConfig()) {
    await showFailureToast(new Error("Please configure your API keys in preferences"), {
      title: "Configuration Error"
    });
    return [];
  }

  try {
    const response = await apiClient.listSecretRequests();
    return response.data;
  } catch (error) {
    await handleApiError(error, "Failed to load secret requests");
    return [];
  }
}

/**
 * Find related secrets for a list of requests
 */
export async function findRelatedSecrets(requests: SecretRequest[]): Promise<Record<string, Secret[]>> {
  if (!validateConfig()) {
    return {};
  }

  try {
    const allSecrets = await loadSecrets();
    const relatedMap: Record<string, Secret[]> = {};

    requests.forEach((request) => {
      const related = allSecrets.filter((secret) => {
        const matchesDescription =
          request.secret_description &&
          secret.description &&
          request.secret_description.toLowerCase().includes(secret.description.toLowerCase());

        const matchesMessage =
          request.secret_message &&
          secret.message &&
          request.secret_message.toLowerCase().includes(secret.message.toLowerCase());

        return matchesDescription || matchesMessage;
      });

      relatedMap[request.id] = related;
    });

    return relatedMap;
  } catch (error) {
    console.error("Failed to load related secrets:", error);
    return {};
  }
}

/**
 * Find related requests for a list of secrets
 */
export async function findRelatedRequests(secrets: Secret[]): Promise<Record<string, SecretRequest[]>> {
  if (!validateConfig()) {
    return {};
  }

  try {
    const allRequests = await loadSecretRequests();
    const relatedMap: Record<string, SecretRequest[]> = {};

    secrets.forEach((secret) => {
      const related = allRequests.filter((request) => {
        const matchesDescription =
          request.secret_description &&
          secret.description &&
          request.secret_description.toLowerCase().includes(secret.description.toLowerCase());

        const matchesMessage =
          request.secret_message &&
          secret.message &&
          request.secret_message.toLowerCase().includes(secret.message.toLowerCase());

        return matchesDescription || matchesMessage;
      });

      relatedMap[secret.id] = related;
    });

    return relatedMap;
  } catch (error) {
    console.error("Failed to load related requests:", error);
    return {};
  }
}
