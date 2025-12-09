import type Stripe from "stripe";

/**
 * Type guard utilities for safely checking Stripe object types.
 * These guards help handle Stripe's expandable fields which can be either
 * string IDs or full objects.
 */

/**
 * Checks if an error is a Stripe API error.
 *
 * @param error - The error to check
 * @returns True if the error is a Stripe error
 *
 * @example
 * ```typescript
 * try {
 *   await stripe.customers.retrieve('cus_123');
 * } catch (error) {
 *   if (isStripeError(error)) {
 *     console.log(error.code); // Type-safe access to Stripe error properties
 *   }
 * }
 * ```
 */
export const isStripeError = (error: unknown): error is Stripe.StripeRawError => {
  return typeof error === "object" && error !== null && "type" in error && "message" in error;
};

/**
 * Checks if a customer field is an expanded Customer object.
 *
 * @param customer - The customer field to check
 * @returns True if the customer is an expanded Customer object
 *
 * @example
 * ```typescript
 * const charge = await stripe.charges.retrieve('ch_123', {
 *   expand: ['customer']
 * });
 *
 * if (isExpandedCustomer(charge.customer)) {
 *   console.log(charge.customer.email); // Type-safe access
 * }
 * ```
 */
export const isExpandedCustomer = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): customer is Stripe.Customer => {
  return typeof customer === "object" && customer !== null && "id" in customer && !("deleted" in customer);
};

/**
 * Checks if a customer field is a deleted Customer object.
 *
 * @param customer - The customer field to check
 * @returns True if the customer is a deleted Customer object
 */
export const isDeletedCustomer = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): customer is Stripe.DeletedCustomer => {
  return typeof customer === "object" && customer !== null && "deleted" in customer && customer.deleted === true;
};

/**
 * Checks if a payment intent field is an expanded PaymentIntent object.
 *
 * @param paymentIntent - The payment intent field to check
 * @returns True if the payment intent is an expanded PaymentIntent object
 */
export const isExpandedPaymentIntent = (
  paymentIntent: string | Stripe.PaymentIntent | null | undefined,
): paymentIntent is Stripe.PaymentIntent => {
  return typeof paymentIntent === "object" && paymentIntent !== null && "id" in paymentIntent;
};

/**
 * Checks if a charge field is an expanded Charge object.
 *
 * @param charge - The charge field to check
 * @returns True if the charge is an expanded Charge object
 */
export const isExpandedCharge = (charge: string | Stripe.Charge | null | undefined): charge is Stripe.Charge => {
  return typeof charge === "object" && charge !== null && "id" in charge;
};

/**
 * Checks if an invoice field is an expanded Invoice object.
 *
 * @param invoice - The invoice field to check
 * @returns True if the invoice is an expanded Invoice object
 */
export const isExpandedInvoice = (invoice: string | Stripe.Invoice | null | undefined): invoice is Stripe.Invoice => {
  return typeof invoice === "object" && invoice !== null && "id" in invoice;
};

/**
 * Checks if a subscription field is an expanded Subscription object.
 *
 * @param subscription - The subscription field to check
 * @returns True if the subscription is an expanded Subscription object
 */
export const isExpandedSubscription = (
  subscription: string | Stripe.Subscription | null | undefined,
): subscription is Stripe.Subscription => {
  return typeof subscription === "object" && subscription !== null && "id" in subscription;
};

/**
 * Checks if a product field is an expanded Product object.
 *
 * @param product - The product field to check
 * @returns True if the product is an expanded Product object
 */
export const isExpandedProduct = (
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined,
): product is Stripe.Product => {
  return typeof product === "object" && product !== null && "id" in product && !("deleted" in product);
};
