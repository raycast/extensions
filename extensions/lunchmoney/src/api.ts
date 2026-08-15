import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
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

async function fetchPrimaryCurrency(client: ReturnType<typeof useLunchMoney>): Promise<string> {
  const { data } = await client.GET("/me");
  return data?.primary_currency ?? "usd";
}

/**
 * The user's primary currency (from account settings), for labeling aggregate totals that
 * are computed in the primary currency via each object's `to_base`. Defaults to "usd" until
 * loaded. Lowercase ISO 4217, as returned by the API.
 *
 * Uses a module-level fetch function (stable reference) so useCachedPromise shares one cache
 * entry across every component that calls this hook, rather than one /me request per caller.
 */
export function usePrimaryCurrency(): string {
  const client = useLunchMoney();
  const { data } = useCachedPromise(fetchPrimaryCurrency, [client]);
  return data ?? "usd";
}
