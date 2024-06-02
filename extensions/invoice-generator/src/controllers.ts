import Stripe from "stripe";
import { fetchCheckoutSessionWithLineItems } from "./utils/stripe/checkout-sessions";

export async function fetchPaymentLinkDetailsController(transactionRef: string) {
  try {
    const checkoutSession = await fetchCheckoutSessionWithLineItems(transactionRef);
    console.log("checkoutSession", checkoutSession);

    //!! Extract the relevant data from the checkout session

    return { data: checkoutSession };
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      return { error: error.message };
    }
  }
}
