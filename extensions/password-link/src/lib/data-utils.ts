import { Secret, SecretRequest } from "../types";
import { apiClient } from "./api-client";
import { validateConfig } from "./config";
import { testSecrets, ENABLE_TEST_DATA } from "./test-data";
import { showFailureToast } from "@raycast/utils";

/**
 * Load secrets with error handling and validation
 */
export async function loadSecrets(): Promise<Secret[]> {
  if (!validateConfig()) {
    await showFailureToast(new Error("Please configure your API keys in preferences"), {
      title: "Configuration Error",
    });
    return [];
  }

  try {
    const response = await apiClient.listSecrets();
    let secrets: Secret[] = response.data;
    if (ENABLE_TEST_DATA && testSecrets.length > 0) {
      // Merge test secrets, avoiding duplicate IDs
      const existingIds = new Set(secrets.map((s) => s.id));
      secrets = [...secrets, ...testSecrets.filter((t) => !existingIds.has(t.id))];
    }
    return secrets;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to load secrets" });
    return ENABLE_TEST_DATA ? (testSecrets as Secret[]) : [];
  }
}

/**
 * Load secret requests with error handling and validation
 */
export async function loadSecretRequests(): Promise<SecretRequest[]> {
  if (!validateConfig()) {
    await showFailureToast(new Error("Please configure your API keys in preferences"), {
      title: "Configuration Error",
    });
    return [];
  }

  try {
    const response = await apiClient.listSecretRequests();
    return response.data;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to load secret requests" });
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
