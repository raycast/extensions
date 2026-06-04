import { Color, Icon, List } from "@raycast/api";

import { WooCommerceOrder, WooCommerceOrderStatus } from "./types";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  "on-hold": "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
  "checkout-draft": "Checkout draft",
};

const statusColors: Record<string, Color> = {
  pending: Color.Yellow,
  processing: Color.Blue,
  "on-hold": Color.Orange,
  completed: Color.Green,
  cancelled: Color.Red,
  refunded: Color.Purple,
  failed: Color.Red,
  "checkout-draft": Color.SecondaryText,
};

export function formatStatus(status: WooCommerceOrderStatus): string {
  return statusLabels[status] ?? sentenceCase(status);
}

export function getStatusIcon(
  status: WooCommerceOrderStatus,
): List.Item.Props["icon"] {
  return {
    source: Icon.CircleFilled,
    tintColor: statusColors[status] ?? Color.SecondaryText,
  };
}

export function formatCustomerName(order: WooCommerceOrder): string {
  const name = [order.billing.first_name, order.billing.last_name]
    .filter(Boolean)
    .join(" ");

  return name || order.billing.company || "Guest customer";
}

export function formatMoney(order: WooCommerceOrder): string {
  const amount = Number(order.total);

  if (Number.isNaN(amount)) {
    return `${order.total} ${order.currency}`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: order.currency,
  }).format(amount);
}

export function formatCurrencyAmount(amount: string, currency: string): string {
  const value = Number(amount);

  if (Number.isNaN(value)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatAddress(
  address: WooCommerceOrder["shipping"] | WooCommerceOrder["billing"],
): string {
  return [
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.company,
    address.address_1,
    address.address_2,
    [address.postcode, address.city].filter(Boolean).join(" "),
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getOrderDetailMarkdown(order: WooCommerceOrder): string {
  const billingAddress = formatAddress(order.billing);
  const shippingAddress = formatAddress(order.shipping);
  const items = order.line_items
    .map((item) => {
      const sku = item.sku ? ` - SKU: ${item.sku}` : "";
      return `- ${item.quantity}x ${item.name}${sku}`;
    })
    .join("\n");

  return [
    `# Order #${order.number}`,
    "",
    `**Status:** ${formatStatus(order.status)}`,
    `**Customer:** ${formatCustomerName(order)}`,
    `**Total:** ${formatMoney(order)}`,
    `**Created:** ${formatDate(order.date_created)}`,
    "",
    "## Products",
    items || "No products found.",
    "",
    "## Billing",
    billingAddress || "No billing address.",
    order.billing.email ? `\n**Email:** ${order.billing.email}` : "",
    order.billing.phone ? `**Phone:** ${order.billing.phone}` : "",
    "",
    "## Shipping",
    shippingAddress || "No shipping address.",
    "",
    "## Customer Note",
    order.customer_note || "No customer note.",
  ].join("\n");
}

function sentenceCase(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
