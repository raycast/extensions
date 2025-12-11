import { getPreferenceValues } from "@raycast/api";
import createClient, { Middleware } from "openapi-fetch";
import { useMemo } from "react";
import type { components, paths } from "./lunchmoney-api";

// Type exports from generated schema
export type Transaction = components["schemas"]["transactionObject"];
export type Category = components["schemas"]["categoryObject"];
export type Tag = components["schemas"]["tagObject"];
export type ManualAccount = components["schemas"]["manualAccountObject"];
export type PlaidAccount = components["schemas"]["plaidAccountObject"];

export function useLunchMoney() {
  const { token } = getPreferenceValues<Preferences>();

  const client = useMemo(() => {
    const baseClient = createClient<paths>({
      baseUrl: "https://api.lunchmoney.dev/v2",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Add error logging and handling middleware
    const errorHandlerMiddleware: Middleware = {
      async onResponse({ response }) {
        // Clone the response so we can read it without consuming it
        const clonedResponse = response.clone();

        // Check if the response is not ok (status >= 400)
        if (!response.ok) {
          const errorText = await clonedResponse.text();
          console.error("API Error Response:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
        }

        return response;
      },
      onError({ error }) {
        console.error("API Network Error:", error);
        // Convert error to a readable format
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`API Error: ${errorMessage}`);
      },
    };

    baseClient.use(errorHandlerMiddleware);

    return baseClient;
  }, [token]);

  return client;
}
