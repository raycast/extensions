import { useState, useEffect } from "react";
import { Secret, SecretRequest } from "../types";
import { apiClient } from "../lib/api-client";
import { validateConfig } from "../lib/config";

export function useRelatedSecrets(request: SecretRequest) {
  const [relatedSecrets, setRelatedSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function findRelatedSecrets() {
      if (!validateConfig()) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.listSecrets();
        const allSecrets = response.data;

        // Filter secrets that match the request's secret_description or secret_message
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

        setRelatedSecrets(related);
      } catch (error) {
        console.error("Failed to load related secrets:", error);
      } finally {
        setIsLoading(false);
      }
    }

    findRelatedSecrets();
  }, [request]);

  return { relatedSecrets, isLoading };
}

export function useRelatedRequests(secret: Secret) {
  const [relatedRequests, setRelatedRequests] = useState<SecretRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function findRelatedRequests() {
      if (!validateConfig()) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.listSecretRequests();
        const allRequests = response.data;

        // Filter requests that match the secret's description or message
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

        setRelatedRequests(related);
      } catch (error) {
        console.error("Failed to load related requests:", error);
      } finally {
        setIsLoading(false);
      }
    }

    findRelatedRequests();
  }, [secret]);

  return { relatedRequests, isLoading };
}
