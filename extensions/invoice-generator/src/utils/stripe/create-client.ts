import Stripe from "stripe";
import { stripeApiKey } from "..";

export const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2024-04-10",
});
