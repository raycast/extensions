import { stripe } from "./create-client";

export async function fetchCheckoutSessionWithLineItems(email: string) {
  return await stripe.checkout.sessions.list({
    limit: 1,
    customer_details: {
      email,
    },
  });
}
