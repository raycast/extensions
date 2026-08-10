// Schwab order schema is large; only the fields the UI reads, all optional
// except identifiers, since payloads vary by order type and account.
export interface Order {
  orderId?: number;
  enteredTime?: string;
  closeTime?: string;
  status?: string;
  orderType?: string;
  duration?: string;
  session?: string;
  price?: number;
  stopPrice?: number;
  quantity?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  cancelable?: boolean;
  accountNumber?: number | string;
  orderLegCollection?: OrderLeg[];
  orderActivityCollection?: OrderActivity[];
}

export interface OrderLeg {
  instruction?: string;
  quantity?: number;
  instrument?: {
    symbol?: string;
    description?: string;
    assetType?: string;
  };
}

export interface OrderActivity {
  activityType?: string;
  executionLegs?: {
    price?: number;
    quantity?: number;
    time?: string;
  }[];
}

const OPEN_STATUSES = new Set([
  "AWAITING_PARENT_ORDER",
  "AWAITING_CONDITION",
  "AWAITING_STOP_CONDITION",
  "AWAITING_MANUAL_REVIEW",
  "ACCEPTED",
  "PENDING_ACTIVATION",
  "QUEUED",
  "WORKING",
  "NEW",
  "AWAITING_RELEASE_TIME",
  "PENDING_ACKNOWLEDGEMENT",
  "PENDING_RECALL",
]);

export type OrderGroup = "open" | "filled" | "other";

export function getOrderGroup(order: Order): OrderGroup {
  const status = order.status ?? "";
  if (OPEN_STATUSES.has(status)) return "open";
  if (status === "FILLED") return "filled";
  return "other";
}
