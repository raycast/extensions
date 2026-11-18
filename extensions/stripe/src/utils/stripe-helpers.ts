import { Color, Icon } from "@raycast/api";
import type Stripe from "stripe";
import { convertAmount } from "@src/utils/index";

/**
 * Format amount with currency
 */
export const formatAmount = (amount: number, currency: string): string => {
  const formattedAmount = convertAmount(amount);
  return `${formattedAmount.toFixed(2)} ${currency.toUpperCase()}`;
};

/**
 * Format amount with sign (for balance transactions)
 */
export const formatAmountWithSign = (amount: number, currency: string): string => {
  const formattedAmount = convertAmount(amount);
  const sign = formattedAmount >= 0 ? "+" : "";
  return `${sign}${formattedAmount.toFixed(2)} ${currency.toUpperCase()}`;
};

/**
 * Format Stripe address into a single string
 */
export const formatBillingAddress = (address?: Stripe.Address | null): string => {
  if (!address) return "";
  return [address.line1, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(", ");
};

/**
 * Generic helper to extract ID from Stripe expandable fields
 * Many Stripe fields can be either a string ID or an expanded object
 */
export const getStripeId = <T extends { id: string }>(field: string | T | null | undefined): string => {
  if (!field) return "";
  return typeof field === "string" ? field : field.id;
};

/**
 * Extract customer ID from charge or payment intent
 */
export const getCustomerId = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string => {
  return getStripeId(customer);
};

/**
 * Extract payment intent ID from charge
 */
export const getPaymentIntentId = (paymentIntent: string | Stripe.PaymentIntent | null | undefined): string => {
  return getStripeId(paymentIntent);
};

/**
 * Extract source ID from balance transaction
 */
export const getSourceId = (source: string | { id: string } | null | undefined): string => {
  return getStripeId(source);
};

/**
 * Get icon and color for charge status
 */
export const getChargeIcon = (charge: Stripe.Charge): { icon: Icon; color: Color } => {
  if (charge.refunded) {
    return { icon: Icon.ArrowUp, color: Color.Red };
  }
  if (charge.disputed) {
    return { icon: Icon.ExclamationMark, color: Color.Orange };
  }
  if (charge.status === "succeeded") {
    return { icon: Icon.CheckCircle, color: Color.Green };
  }
  if (charge.status === "failed") {
    return { icon: Icon.XMarkCircle, color: Color.Red };
  }
  return { icon: Icon.Circle, color: Color.SecondaryText };
};

/**
 * Get icon and color for payment intent status
 */
export const getPaymentIntentIcon = (status: Stripe.PaymentIntent.Status): { icon: Icon; color: Color } => {
  const iconMap: Record<string, { icon: Icon; color: Color }> = {
    succeeded: { icon: Icon.CheckCircle, color: Color.Green },
    processing: { icon: Icon.CircleProgress, color: Color.Blue },
    requires_payment_method: { icon: Icon.Circle, color: Color.Orange },
    requires_confirmation: { icon: Icon.Clock, color: Color.Yellow },
    requires_action: { icon: Icon.ExclamationMark, color: Color.Orange },
    requires_capture: { icon: Icon.LockUnlocked, color: Color.Purple },
    canceled: { icon: Icon.XMarkCircle, color: Color.Red },
  };
  return iconMap[status] || { icon: Icon.Circle, color: Color.SecondaryText };
};

/**
 * Get icon and color for balance transaction type
 */
export const getTransactionIcon = (type: string): { icon: Icon; color: Color } => {
  const iconMap: Record<string, { icon: Icon; color: Color }> = {
    charge: { icon: Icon.ArrowDown, color: Color.Green },
    refund: { icon: Icon.ArrowUp, color: Color.Red },
    adjustment: { icon: Icon.CircleProgress, color: Color.Orange },
    payout: { icon: Icon.BankNote, color: Color.Blue },
    transfer: { icon: Icon.ArrowRight, color: Color.Purple },
    payment: { icon: Icon.Coins, color: Color.Green },
  };
  return iconMap[type] || { icon: Icon.Receipt, color: Color.SecondaryText };
};

/**
 * Check if a charge is refundable
 */
export const isRefundable = (charge: Stripe.Charge): boolean => {
  return charge.status === "succeeded" && !charge.refunded && charge.amount > charge.amount_refunded;
};

/**
 * Get human-readable status description for payment intent
 */
export const getPaymentIntentStatusDescription = (status: Stripe.PaymentIntent.Status): string => {
  const descriptions: Record<string, string> = {
    succeeded: "Completed",
    processing: "Processing",
    requires_payment_method: "Awaiting Payment",
    requires_confirmation: "Needs Confirmation",
    requires_action: "Action Required",
    requires_capture: "Ready to Capture",
    canceled: "Canceled",
  };
  return descriptions[status] || status;
};

/**
 * Check if payment intent requires action
 */
export const paymentIntentRequiresAction = (status: Stripe.PaymentIntent.Status): boolean => {
  return ["requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"].includes(status);
};
