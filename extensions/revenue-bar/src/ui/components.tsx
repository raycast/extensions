import { Action, ActionPanel, Color, Icon, Image, List, openExtensionPreferences } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { describeErrorKind, ProviderErrorKind } from "../core/errors";
import { PROVIDER_LABELS, ProviderId, RefundKind, SaleStatus, SubscriptionStatus } from "../providers/types";
import { SALE_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS } from "./format";
import { SHORTCUTS } from "./shortcuts";

const PROVIDER_SITES: Record<ProviderId, string> = {
  stripe: "https://stripe.com",
  lemonsqueezy: "https://www.lemonsqueezy.com",
  gumroad: "https://gumroad.com",
  paddle: "https://www.paddle.com",
};

/** Provider logos come from the site favicon at runtime (PLAN §3: no bundled provider assets). */
export function providerIcon(id: ProviderId): Image.ImageLike {
  return getFavicon(PROVIDER_SITES[id], { fallback: Icon.BankNote });
}

/** stripe's charge icons: succeeded CheckCircle/Green, refunded ArrowUp/Red, disputed ExclamationMark/Orange. */
export function saleStatusIcon(status: SaleStatus): Image.ImageLike {
  switch (status) {
    case "paid":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "refunded":
      return { source: Icon.ArrowUp, tintColor: Color.Red };
    case "partially_refunded":
      return { source: Icon.ArrowUp, tintColor: Color.Yellow };
    case "disputed":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "pending":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

/** stripe's customer-payment tag colors. */
export function saleStatusTag(status: SaleStatus): { value: string; color: Color } {
  const colors: Record<SaleStatus, Color> = {
    paid: Color.Green,
    refunded: Color.SecondaryText,
    partially_refunded: Color.Yellow,
    disputed: Color.Orange,
    pending: Color.Blue,
  };
  return { value: SALE_STATUS_LABELS[status], color: colors[status] };
}

/** stripe's subscription colors: active Green, trialing Blue, past_due Orange, canceled Red, paused SecondaryText. */
export function subscriptionStatusTag(status: SubscriptionStatus): { value: string; color: Color } {
  const colors: Record<SubscriptionStatus, Color> = {
    active: Color.Green,
    trialing: Color.Blue,
    past_due: Color.Orange,
    cancelled: Color.Red,
    paused: Color.SecondaryText,
  };
  return { value: SUBSCRIPTION_STATUS_LABELS[status], color: colors[status] };
}

/** Refunds use stripe's refund icon; disputes and chargebacks use its disputed icon. */
export function refundKindIcon(kind: RefundKind): Image.ImageLike {
  return kind === "refund"
    ? { source: Icon.ArrowUp, tintColor: Color.Red }
    : { source: Icon.ExclamationMark, tintColor: Color.Orange };
}

export function RefreshAction(props: { onRefresh: () => void }) {
  return <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={props.onRefresh} />;
}

export function PreferencesAction() {
  return (
    <Action
      title="Open Extension Preferences"
      icon={Icon.Gear}
      shortcut={SHORTCUTS.preferences}
      onAction={openExtensionPreferences}
    />
  );
}

export function CommonActions(props: { onRefresh?: () => void }) {
  return (
    <ActionPanel.Section>
      {props.onRefresh ? <RefreshAction onRefresh={props.onRefresh} /> : null}
      <PreferencesAction />
    </ActionPanel.Section>
  );
}

/** A failed provider renders as one red row (chartmogul's error item) so the others stay visible. */
export function ProviderErrorItem(props: {
  provider: ProviderId;
  error: { kind: string; message: string };
  onRetry?: () => void;
}) {
  const title = describeErrorKind(props.error.kind as ProviderErrorKind);
  return (
    <List.Item
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      title={PROVIDER_LABELS[props.provider]}
      subtitle={title}
      accessories={[{ text: { value: props.error.message, color: Color.Red }, tooltip: props.error.message }]}
      detail={
        <List.Item.Detail
          markdown={`## ${PROVIDER_LABELS[props.provider]}\n\n${title}\n\n\`${props.error.message}\``}
        />
      }
      actions={
        <ActionPanel>
          {props.onRetry ? (
            <Action title="Retry" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={props.onRetry} />
          ) : null}
          <PreferencesAction />
          <Action.CopyToClipboard title="Copy Error Message" content={props.error.message} shortcut={SHORTCUTS.copy} />
        </ActionPanel>
      }
    />
  );
}

/** EmptyView with a preferences action (stripe "No {Env} API Key", datafast, autumn). */
export function NoProvidersEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Key}
      title="No API Keys"
      description="Add a Stripe, Lemon Squeezy, Gumroad or Paddle key in the extension preferences."
      actions={
        <ActionPanel>
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}
