import { open, showToast, Toast } from "@raycast/api";
import { supabase } from "./supabase";
import { STRIPE_PRICE_ANNUAL, STRIPE_PRICE_MONTHLY } from "./config";
import { CHECKOUT_SUCCESS_URL, CHECKOUT_CANCEL_URL } from "../constants";

export type BillingInterval = "annual" | "monthly";

const PRICE_BY_INTERVAL: Record<BillingInterval, string> = {
  annual: STRIPE_PRICE_ANNUAL,
  monthly: STRIPE_PRICE_MONTHLY,
};

type CheckoutResponse = { url?: string };

/**
 * Starts Joey Pro checkout for the signed-in user.
 *
 * Invokes the `stripe-subscribe` edge function — the in-memory Supabase session
 * (from sign-in) supplies the JWT automatically — then opens the returned Stripe
 * Checkout URL in the browser. Stripe redirects back to the website on
 * success/cancel.
 *
 * @param interval - Which Joey Pro plan to purchase
 * @throws {Error} When the user is not authenticated or checkout creation fails
 */
export async function startCheckout(interval: BillingInterval): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening checkout..." });

  const { data, error } = await supabase.functions.invoke<CheckoutResponse>("stripe-subscribe", {
    body: {
      priceId: PRICE_BY_INTERVAL[interval],
      successUrl: CHECKOUT_SUCCESS_URL,
      cancelUrl: CHECKOUT_CANCEL_URL,
    },
  });

  if (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't start checkout";
    toast.message = error.message;
    return;
  }

  if (!data?.url) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't start checkout";
    toast.message = "No checkout URL was returned";
    return;
  }

  await open(data.url);
  toast.style = Toast.Style.Success;
  toast.title = "Checkout opened in your browser";
}
