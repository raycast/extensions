import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "@src/hooks";
import { convertTimestampToDate, titleCase } from "@src/utils";
import { STRIPE_ENDPOINTS } from "@src/enums";
import { ListContainer, withProfileContext } from "@src/components";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";

/**
 * Event category mappings for organizing Stripe events.
 * Groups related event types together for better organization.
 */
const EVENT_CATEGORIES: Record<string, string[]> = {
  payment: ["charge", "payment_intent", "payment_method", "checkout", "payment_link"],
  customer: ["customer"],
  subscription: ["subscription", "subscription_schedule", "invoice", "invoiceitem"],
  payout: ["payout", "transfer", "topup"],
  dispute: ["dispute", "charge_dispute"],
  refund: ["refund"],
  account: ["account", "account_external_account"],
  balance: ["balance"],
  product: ["product", "price", "coupon", "promotion_code"],
  mandate: ["mandate"],
  setup_intent: ["setup_intent"],
  source: ["source"],
};

/**
 * Determines the category of an event based on its type prefix.
 */
const getEventCategory = (eventType: string): string => {
  const baseType = eventType.split(".")[0];
  for (const [category, types] of Object.entries(EVENT_CATEGORIES)) {
    if (types.includes(baseType)) {
      return category;
    }
  }
  return "other";
};

/**
 * Returns icon and color for an event based on its category.
 */
const getEventIcon = (eventType: string) => {
  const category = getEventCategory(eventType);
  const iconMap: Record<string, { icon: Icon; color: Color }> = {
    payment: { icon: Icon.Coins, color: Color.Green },
    customer: { icon: Icon.Person, color: Color.Blue },
    subscription: { icon: Icon.Repeat, color: Color.Purple },
    payout: { icon: Icon.BankNote, color: Color.Blue },
    dispute: { icon: Icon.ExclamationMark, color: Color.Orange },
    refund: { icon: Icon.ArrowUp, color: Color.Red },
    account: { icon: Icon.Building, color: Color.Magenta },
    balance: { icon: Icon.BankNote, color: Color.Green },
    product: { icon: Icon.Box, color: Color.Yellow },
    mandate: { icon: Icon.Document, color: Color.Blue },
    setup_intent: { icon: Icon.Key, color: Color.Purple },
    source: { icon: Icon.Link, color: Color.SecondaryText },
    other: { icon: Icon.Circle, color: Color.SecondaryText },
  };
  return iconMap[category] || iconMap.other;
};

/**
 * Returns a human-friendly description for a Stripe event type.
 * Maps technical event names to user-friendly descriptions.
 */
const getEventDescription = (eventType: string): string => {
  // Common event type descriptions
  const descriptions: Record<string, string> = {
    // Charge events
    "charge.succeeded": "Payment Successful",
    "charge.failed": "Payment Failed",
    "charge.captured": "Payment Captured",
    "charge.refunded": "Payment Refunded",
    "charge.updated": "Payment Updated",

    // Payment Intent events
    "payment_intent.succeeded": "Payment Completed",
    "payment_intent.payment_failed": "Payment Failed",
    "payment_intent.created": "Payment Started",
    "payment_intent.canceled": "Payment Canceled",
    "payment_intent.amount_capturable_updated": "Payment Ready to Capture",

    // Customer events
    "customer.created": "New Customer",
    "customer.updated": "Customer Updated",
    "customer.deleted": "Customer Deleted",
    "customer.subscription.created": "Subscription Started",
    "customer.subscription.updated": "Subscription Changed",
    "customer.subscription.deleted": "Subscription Ended",

    // Invoice events
    "invoice.created": "Invoice Created",
    "invoice.finalized": "Invoice Finalized",
    "invoice.paid": "Invoice Paid",
    "invoice.payment_failed": "Invoice Payment Failed",
    "invoice.upcoming": "Upcoming Invoice",

    // Subscription events
    "subscription.created": "Subscription Started",
    "subscription.updated": "Subscription Changed",
    "subscription.deleted": "Subscription Ended",
    "subscription.trial_will_end": "Trial Ending Soon",

    // Payout events
    "payout.created": "Payout Scheduled",
    "payout.paid": "Payout Sent",
    "payout.failed": "Payout Failed",
    "payout.canceled": "Payout Canceled",

    // Refund events
    "refund.created": "Refund Processed",
    "refund.updated": "Refund Updated",
    "refund.failed": "Refund Failed",

    // Dispute events
    "charge.dispute.created": "Dispute Opened",
    "charge.dispute.updated": "Dispute Updated",
    "charge.dispute.closed": "Dispute Resolved",

    // Product events
    "product.created": "Product Added",
    "product.updated": "Product Updated",
    "price.created": "Price Added",
    "price.updated": "Price Updated",

    // Checkout events
    "checkout.session.completed": "Checkout Completed",
    "checkout.session.expired": "Checkout Expired",

    // Payment method events
    "payment_method.attached": "Payment Method Added",
    "payment_method.detached": "Payment Method Removed",
    "payment_method.updated": "Payment Method Updated",
  };

  return descriptions[eventType] || eventType.split(".").map(titleCase).join(" → ");
};

/**
 * Determines if an event requires action and provides a reason.
 * Helps identify critical events that need immediate attention.
 */
const getActionRequired = (eventType: string): { required: boolean; reason?: string } => {
  const actionableEvents: Record<string, string> = {
    // Payment issues
    "charge.failed": "Payment failed - contact customer",
    "payment_intent.payment_failed": "Payment failed - retry needed",
    "invoice.payment_failed": "Invoice unpaid - follow up",

    // Disputes
    "charge.dispute.created": "Respond to dispute by deadline",
    "charge.dispute.funds_withdrawn": "Funds held - respond urgently",

    // Subscription issues
    "customer.subscription.deleted": "Customer churned - reach out",
    "subscription.trial_will_end": "Trial ending - convert customer",

    // Payout issues
    "payout.failed": "Payout failed - update banking info",
    "payout.canceled": "Payout canceled - verify details",

    // Account issues
    "account.updated": "Review account changes",
  };

  if (eventType in actionableEvents) {
    return { required: true, reason: actionableEvents[eventType] };
  }

  return { required: false };
};

/**
 * Generates a subtitle for an event showing action warnings, amounts, and status.
 */
const getEventSubtitle = (event: Stripe.Event): string => {
  const eventData = event.data.object as unknown as Record<string, unknown>;
  const parts: string[] = [];

  // Check if action required first
  const actionInfo = getActionRequired(event.type);
  if (actionInfo.required && actionInfo.reason) {
    parts.push(`⚠️ ${actionInfo.reason}`);
  }

  // Add amount if present
  if ("amount" in eventData && typeof eventData.amount === "number") {
    const currency = typeof eventData.currency === "string" ? eventData.currency.toUpperCase() : "";
    parts.push(`${(eventData.amount / 100).toFixed(2)} ${currency}`);
  }

  // Add customer info if present (only if no action required, to avoid clutter)
  if (!actionInfo.required && "customer" in eventData && typeof eventData.customer === "string") {
    parts.push(`Customer: ${eventData.customer.slice(0, 18)}...`);
  }

  // Add status if present and meaningful
  if ("status" in eventData && typeof eventData.status === "string") {
    const status = eventData.status;
    if (!["succeeded", "paid", "active"].includes(status)) {
      parts.push(titleCase(status));
    }
  }

  return parts.join(" • ");
};

/**
 * Action panel for event items.
 * Provides navigation to Stripe Dashboard and copy actions for event and object IDs.
 */
const EventActions = ({ event, dashboardUrl }: { event: Stripe.Event; dashboardUrl: string }) => {
  const objectId =
    typeof event.data.object === "object" && "id" in event.data.object ? (event.data.object.id as string) : null;

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="View in Stripe Dashboard"
        url={`${dashboardUrl}/events/${event.id}`}
        icon={Icon.Globe}
      />
      <Action.CopyToClipboard title="Copy Event ID" content={event.id} shortcut={SHORTCUTS.COPY_PRIMARY} />
      <Action.CopyToClipboard
        title="Copy Event Type"
        content={event.type}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      />
      {objectId && (
        <Action.CopyToClipboard
          title="Copy Object ID"
          content={objectId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      )}
    </ActionPanel>
  );
};

/**
 * Detailed view of a Stripe event.
 * Shows event description, technical type, object details, metadata, and identifiers.
 */
const EventDetail = ({ event }: { event: Stripe.Event }) => {
  const eventData = event.data.object as unknown as Record<string, unknown>;
  const objectId = "id" in eventData ? (eventData.id as string) : "N/A";
  const hasMetadata = "metadata" in eventData && typeof eventData.metadata === "object";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Event" text={getEventDescription(event.type)} />
          <List.Item.Detail.Metadata.Label title="Technical Type" text={event.type} />
          <List.Item.Detail.Metadata.Label title="Created" text={convertTimestampToDate(event.created)} />
          {event.request?.id && <List.Item.Detail.Metadata.Label title="Request ID" text={event.request.id} />}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Object Details" />
          <List.Item.Detail.Metadata.Label title="Object ID" text={objectId} />
          {"amount" in eventData && typeof eventData.amount === "number" && (
            <List.Item.Detail.Metadata.Label
              title="Amount"
              text={`${(eventData.amount / 100).toFixed(2)} ${(eventData.currency as string)?.toUpperCase() || ""}`}
            />
          )}
          {"status" in eventData && typeof eventData.status === "string" && (
            <List.Item.Detail.Metadata.Label title="Status" text={titleCase(eventData.status)} />
          )}
          {"customer" in eventData && typeof eventData.customer === "string" && (
            <List.Item.Detail.Metadata.Label title="Customer" text={eventData.customer} />
          )}

          {hasMetadata && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Custom Metadata" />
              {Object.entries(eventData.metadata as Record<string, string>).map(([key, value]) => (
                <List.Item.Detail.Metadata.Label key={key} title={titleCase(key)} text={value} />
              ))}
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Identifiers" />
          <List.Item.Detail.Metadata.Label title="Event ID" text={event.id} />
          {event.livemode !== undefined && (
            <List.Item.Detail.Metadata.Label title="Mode" text={event.livemode ? "Live" : "Test"} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

/**
 * List item for a single Stripe event.
 * Displays event description, subtitle with key details, and visual indicators for action-required events.
 */
const EventItem = ({ event, dashboardUrl }: { event: Stripe.Event; dashboardUrl: string }) => {
  const actionInfo = getActionRequired(event.type);

  // Override icon for action-required events
  let { icon, color } = getEventIcon(event.type);
  if (actionInfo.required) {
    icon = Icon.ExclamationMark;
    color = Color.Orange;
  }

  const title = getEventDescription(event.type);
  const subtitle = getEventSubtitle(event);

  return (
    <List.Item
      key={event.id}
      title={title}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color as Color.ColorLike }}
      actions={<EventActions event={event} dashboardUrl={dashboardUrl} />}
      detail={<EventDetail event={event} />}
    />
  );
};

/**
 * Events View - Displays recent Stripe webhook events organized by category.
 *
 * Features:
 * - Action Required section highlighting critical events needing attention
 * - Categorized events: Payments, Customers, Subscriptions, Payouts, Disputes, etc.
 * - Human-friendly event descriptions with technical names
 * - Event metadata and object details
 * - Quick navigation to related objects in Stripe Dashboard
 *
 * Useful for monitoring webhook activity, debugging integrations, and tracking account events.
 */
const Events = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.EVENTS, { isList: true });
  const { dashboardUrl } = useStripeDashboard();
  const events = data as Stripe.Event[];

  // Separate action-required events
  const actionRequired = events.filter((e) => getActionRequired(e.type).required);
  const otherEvents = events.filter((e) => !getActionRequired(e.type).required);

  // Group other events by category
  const groupedEvents = otherEvents.reduce(
    (acc, event) => {
      const category = getEventCategory(event.type);
      if (!acc[category]) acc[category] = [];
      acc[category].push(event);
      return acc;
    },
    {} as Record<string, Stripe.Event[]>,
  );

  const categoryTitles: Record<string, string> = {
    payment: "💳 Payments",
    customer: "👤 Customers",
    subscription: "🔄 Subscriptions",
    payout: "💰 Payouts",
    dispute: "⚠️ Disputes",
    refund: "↩️ Refunds",
    account: "🏢 Accounts",
    balance: "💵 Balance",
    product: "📦 Products",
    mandate: "📄 Mandates",
    setup_intent: "🔑 Setup Intents",
    source: "🔗 Sources",
    other: "Other Events",
  };

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      {actionRequired.length > 0 && (
        <List.Section title={`🚨 Action Required (${actionRequired.length})`}>
          {actionRequired.map((event) => (
            <EventItem key={event.id} event={event} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}

      {Object.entries(groupedEvents)
        .sort(([a], [b]) => {
          const order = [
            "dispute",
            "payment",
            "refund",
            "customer",
            "subscription",
            "payout",
            "balance",
            "account",
            "product",
            "setup_intent",
            "mandate",
            "source",
            "other",
          ];
          return order.indexOf(a) - order.indexOf(b);
        })
        .map(([category, categoryEvents]) => (
          <List.Section key={category} title={`${categoryTitles[category]} (${categoryEvents.length})`}>
            {categoryEvents.map((event) => (
              <EventItem key={event.id} event={event} dashboardUrl={dashboardUrl} />
            ))}
          </List.Section>
        ))}
    </ListContainer>
  );
};

export default withProfileContext(Events);
