import { Color } from "@raycast/api";
import type Stripe from "stripe";

/**
 * Utilities for mapping Stripe statuses to Raycast colors.
 * Provides consistent visual feedback across the extension.
 */

/**
 * Gets the appropriate color for a subscription status.
 *
 * @param status - The Stripe subscription status
 * @returns Raycast Color for the status
 *
 * @example
 * ```typescript
 * getSubscriptionStatusColor("active") // Color.Green
 * getSubscriptionStatusColor("canceled") // Color.Red
 * getSubscriptionStatusColor("past_due") // Color.Orange
 * ```
 */
export const getSubscriptionStatusColor = (status: Stripe.Subscription.Status): Color => {
  const colorMap: Record<Stripe.Subscription.Status, Color> = {
    active: Color.Green,
    canceled: Color.Red,
    past_due: Color.Orange,
    unpaid: Color.Red,
    incomplete: Color.Yellow,
    incomplete_expired: Color.Red,
    trialing: Color.Blue,
    paused: Color.SecondaryText,
  };

  return colorMap[status] ?? Color.SecondaryText;
};

/**
 * Gets the appropriate color for a charge status.
 *
 * @param status - The Stripe charge status
 * @returns Raycast Color for the status
 */
export const getChargeStatusColor = (status: Stripe.Charge.Status): Color => {
  const colorMap: Record<Stripe.Charge.Status, Color> = {
    succeeded: Color.Green,
    pending: Color.Yellow,
    failed: Color.Red,
  };

  return colorMap[status] ?? Color.SecondaryText;
};

/**
 * Gets the appropriate color for a payment intent status.
 *
 * @param status - The Stripe payment intent status
 * @returns Raycast Color for the status
 */
export const getPaymentIntentStatusColor = (status: Stripe.PaymentIntent.Status): Color => {
  const colorMap: Record<Stripe.PaymentIntent.Status, Color> = {
    succeeded: Color.Green,
    processing: Color.Blue,
    requires_payment_method: Color.Orange,
    requires_confirmation: Color.Yellow,
    requires_action: Color.Orange,
    requires_capture: Color.Purple,
    canceled: Color.Red,
  };

  return colorMap[status] ?? Color.SecondaryText;
};

/**
 * Gets the appropriate color for a balance transaction type.
 *
 * @param type - The balance transaction type
 * @returns Raycast Color for the transaction type
 */
export const getTransactionTypeColor = (type: string): Color => {
  const colorMap: Record<string, Color> = {
    charge: Color.Green,
    refund: Color.Red,
    adjustment: Color.Orange,
    payout: Color.Blue,
    transfer: Color.Purple,
    payment: Color.Green,
  };

  return colorMap[type] ?? Color.SecondaryText;
};

/**
 * Gets the appropriate color for an invoice status.
 *
 * @param status - The Stripe invoice status
 * @returns Raycast Color for the status
 */
export const getInvoiceStatusColor = (status: Stripe.Invoice.Status): Color => {
  const colorMap: Record<Stripe.Invoice.Status, Color> = {
    draft: Color.SecondaryText,
    open: Color.Yellow,
    paid: Color.Green,
    uncollectible: Color.Red,
    void: Color.SecondaryText,
  };

  return colorMap[status] ?? Color.SecondaryText;
};
