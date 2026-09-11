import { useMemo } from "react";
import Stripe from "stripe";
import { useProfileContext } from "@src/hooks/use-profile-context";
import { STRIPE_API_VERSION } from "@src/enums";

/**
 * Custom hook for creating a Stripe client instance.
 *
 * This hook manages the Stripe client lifecycle based on the active profile
 * and environment (test/live). It automatically selects the appropriate API key
 * and memoizes the client to prevent unnecessary re-instantiation.
 *
 * @returns Stripe client instance or null if no API key is configured
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const stripe = useStripeClient();
 *
 *   if (!stripe) {
 *     return <EmptyView title="No API key configured" />;
 *   }
 *
 *   const customers = await stripe.customers.list();
 *   // ...
 * };
 * ```
 */
export const useStripeClient = (): Stripe | null => {
  const { activeProfile, activeEnvironment } = useProfileContext();

  const apiKey = activeEnvironment === "test" ? activeProfile?.testApiKey : activeProfile?.liveApiKey;

  return useMemo(() => (apiKey ? new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION }) : null), [apiKey]);
};
