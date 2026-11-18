import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { MissingTokenView } from "./components/MissingTokenView";
import { statusText } from "./lib/format";
import { showStarlingErrorToast } from "./lib/errors";
import { getResolvedPreferences } from "./lib/preferences";
import { getCards, updateCardControl } from "./lib/starling";
import { StarlingCard, StarlingCardControl } from "./lib/types";

const CARD_CONTROLS: Array<{ title: string; value: StarlingCardControl }> = [
  { title: "Card payments", value: "enabled" },
  { title: "ATM withdrawals", value: "atm-enabled" },
  { title: "Online payments", value: "online-enabled" },
  { title: "In-store card payments", value: "pos-enabled" },
  { title: "Mobile wallet", value: "mobile-wallet-enabled" },
  { title: "Gambling payments", value: "gambling-enabled" },
  { title: "Magnetic stripe", value: "mag-stripe-enabled" },
  { title: "Currency switch", value: "currency-switch" },
];

function cardUid(card: StarlingCard): string | undefined {
  return card.cardUid || card.uid;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function humanizeLabel(value: string | undefined): string | undefined {
  const normalized = nonEmpty(value);
  if (!normalized) return undefined;

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cardReference(uid: string): string {
  const firstSegment = uid.split("-")[0];
  return firstSegment || uid.slice(0, 8);
}

function maskedLast4(card: StarlingCard): string | undefined {
  const digits = nonEmpty(card.last4);
  return digits ? `•••• ${digits}` : undefined;
}

function cardProfile(card: StarlingCard): string | undefined {
  const entries = [humanizeLabel(card.cardType), humanizeLabel(card.cardAssociation)].filter((value): value is string =>
    Boolean(value),
  );
  const deduped = entries.filter(
    (value, index) => entries.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index,
  );
  return deduped.length > 0 ? deduped.join(" • ") : undefined;
}

function cardSubtitle(card: StarlingCard, uid: string): string {
  const profile = cardProfile(card);
  const last4 = maskedLast4(card);
  if (profile) {
    const summary = [profile, last4].filter((value): value is string => Boolean(value)).join(" • ");
    if (summary) return summary;
  }

  if (last4) {
    const activeControls = [
      card.onlineEnabled ? "Online" : undefined,
      card.posEnabled ? "POS" : undefined,
      card.atmEnabled ? "ATM" : undefined,
    ].filter((value): value is string => Boolean(value));
    return activeControls.length > 0 ? `${last4} • ${activeControls.join("/")}` : last4;
  }

  return `Reference #${cardReference(uid)}`;
}

function cardKeywords(card: StarlingCard, uid: string): string[] {
  const profile = cardProfile(card);
  const status = nonEmpty(card.cardStatus);
  const last4 = nonEmpty(card.last4);
  const activation = activationText(card);

  return [
    nonEmpty(card.name),
    profile,
    humanizeLabel(card.cardType),
    humanizeLabel(card.cardAssociation),
    status,
    activation,
    last4,
    uid,
    cardReference(uid),
  ].filter((value): value is string => Boolean(value));
}

type CardControlSummary = {
  label: string;
  value: boolean | undefined;
};

function cardControlSummaries(card: StarlingCard): CardControlSummary[] {
  return [
    { label: "Online", value: card.onlineEnabled },
    { label: "In-store", value: card.posEnabled },
    { label: "ATM", value: card.atmEnabled },
    { label: "Wallet", value: card.mobileWalletEnabled },
  ];
}

function enabledControls(card: StarlingCard): string[] {
  return cardControlSummaries(card)
    .filter((control) => control.value === true)
    .map((control) => control.label);
}

function disabledControls(card: StarlingCard): string[] {
  return cardControlSummaries(card)
    .filter((control) => control.value === false)
    .map((control) => control.label);
}

function enabledCurrencies(card: StarlingCard): string[] {
  return (card.currencyFlags ?? [])
    .filter((flag) => flag.enabled === true)
    .map((flag) => flag.currency)
    .filter((currency): currency is string => Boolean(currency));
}

function activationText(card: StarlingCard): string {
  if (card.cancelled) return "Canceled";
  if (card.activated === true) return "Active";
  if (card.activationRequested === true) return "Pending";
  return "Unknown";
}

interface CardControlFormValues {
  control: StarlingCardControl;
  enabled: string;
}

function cardDisplayName(card: StarlingCard, uid: string): string {
  const name = nonEmpty(card.name);
  if (name) return name;

  const profile = cardProfile(card);
  const last4 = maskedLast4(card);
  if (profile && last4) return `${profile} • ${last4}`;
  if (profile) return profile;
  if (last4) return `Card ${last4}`;
  return `Card #${cardReference(uid)}`;
}

function cardStatus(card: StarlingCard): string | undefined {
  return card.cardStatus || (typeof card.enabled === "boolean" ? (card.enabled ? "ENABLED" : "DISABLED") : undefined);
}

function isCancelledCard(card: StarlingCard): boolean {
  if (card.cancelled === true) return true;
  const normalizedStatus = cardStatus(card)?.trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
}

function CardControlForm(props: { card: StarlingCard }) {
  const { card } = props;
  const uid = cardUid(card);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: CardControlFormValues) {
    if (!uid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing card reference",
      });
      return;
    }

    const enabled = values.enabled === "true";

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating card settings",
    });

    try {
      await updateCardControl({
        cardUid: uid,
        control: values.control,
        enabled,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Card settings updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update card settings";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Card Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Card" text={`Card: ${cardDisplayName(card, uid || "Unavailable")}`} />
      <Form.Dropdown id="control" title="Setting" defaultValue="enabled">
        {CARD_CONTROLS.map((control) => (
          <Form.Dropdown.Item key={control.value} value={control.value} title={control.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="enabled" title="Set To" defaultValue="true">
        <Form.Dropdown.Item value="true" title="On" />
        <Form.Dropdown.Item value="false" title="Off" />
      </Form.Dropdown>
    </Form>
  );
}

function CardToggleAction(props: { card: StarlingCard; uid: string; onReload: () => void }) {
  const { card, uid, onReload } = props;

  return (
    <Action
      title={card.enabled ? "Lock Card" : "Unlock Card"}
      icon={card.enabled ? Icon.Lock : Icon.LockUnlocked}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: card.enabled ? "Locking card" : "Unlocking card",
        });

        try {
          await updateCardControl({
            cardUid: uid,
            control: "enabled",
            enabled: !card.enabled,
          });
          toast.style = Toast.Style.Success;
          toast.title = card.enabled ? "Card locked" : "Card unlocked";
          onReload();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not update card";
          if (error instanceof Error) {
            toast.message = error.message;
          }
        }
      }}
    />
  );
}

function CardDetail(props: { card: StarlingCard; uid: string; isDemoData: boolean; onReload: () => void }) {
  const { card, uid, isDemoData, onReload } = props;
  const status = cardStatus(card);
  const displayName = cardDisplayName(card, uid);
  const profile = cardProfile(card);
  const activeControls = enabledControls(card);
  const inactiveControls = disabledControls(card);
  const currencies = enabledCurrencies(card);
  const statusLabel = statusText(status);
  const paymentsLabel = card.enabled === true ? "On" : card.enabled === false ? "Off" : "Unknown";
  const activationLabel = activationText(card);

  const markdownSections = [
    `# ${displayName}`,
    profile ? `_${profile}_` : undefined,
    "### Overview",
    `- Status: **${statusLabel}**`,
    `- Card payments: **${paymentsLabel}**`,
    `- Activation: **${activationLabel}**`,
    activeControls.length > 0
      ? `### Enabled Controls\n${activeControls.map((control) => `- ${control}`).join("\n")}`
      : undefined,
    inactiveControls.length > 0
      ? `### Disabled Controls\n${inactiveControls.map((control) => `- ${control}`).join("\n")}`
      : undefined,
  ];
  const markdown = markdownSections.filter((section): section is string => Boolean(section)).join("\n\n");

  return (
    <Detail
      navigationTitle={displayName}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={statusLabel} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Card payments" text={paymentsLabel} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Activation" text={activationLabel} />
          <Detail.Metadata.Separator />
          {currencies.length > 0 ? (
            <Detail.Metadata.TagList title="Enabled currencies">
              {currencies.map((currency) => (
                <Detail.Metadata.TagList.Item key={currency} text={currency} color={Color.SecondaryText} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Enabled currencies" text="-" />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isDemoData ? (
            <Action.Push title="Manage Card Settings" icon={Icon.Switch} target={<CardControlForm card={card} />} />
          ) : null}
          {!isDemoData ? <CardToggleAction card={card} uid={uid} onReload={onReload} /> : null}
          <Action title="Reload Cards" icon={Icon.ArrowClockwise} onAction={onReload} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function CardsCommand() {
  const isDemoData = getResolvedPreferences().useDemoData;
  const { data, isLoading, error, revalidate } = useCachedPromise(getCards, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      void showStarlingErrorToast(error, "Failed to load cards");
    }
  }, [error]);

  const cardsWithUid = (data ?? [])
    .map((card) => {
      const uid = cardUid(card);
      return uid ? { card, uid } : undefined;
    })
    .filter((entry): entry is { card: StarlingCard; uid: string } => Boolean(entry));

  const visibleCards = cardsWithUid.filter((entry) => !isCancelledCard(entry.card));
  const activeCards = visibleCards.filter((entry) => entry.card.activated === true);
  const inactiveCards = visibleCards.filter((entry) => entry.card.activated !== true);

  function renderCardItem(card: StarlingCard, uid: string) {
    const displayName = cardDisplayName(card, uid);
    const last4 = maskedLast4(card);
    const accessoryLast4 = last4 && !displayName.includes(last4) ? last4 : "";
    const activationLabel = activationText(card);
    const activationColor =
      activationLabel === "Canceled" ? Color.Red : card.activated === true ? Color.Green : Color.Orange;

    return (
      <List.Item
        key={uid}
        icon={Icon.CreditCard}
        title={displayName}
        subtitle={cardSubtitle(card, uid)}
        keywords={cardKeywords(card, uid)}
        accessories={[
          {
            tag: {
              value: activationLabel,
              color: activationColor,
            },
          },
          {
            text: accessoryLast4,
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<CardDetail card={card} uid={uid} isDemoData={isDemoData} onReload={revalidate} />}
            />
            {!isDemoData ? <CardToggleAction card={card} uid={uid} onReload={revalidate} /> : null}
            {!isDemoData ? (
              <Action.Push title="Manage Card Settings" icon={Icon.Switch} target={<CardControlForm card={card} />} />
            ) : null}
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search cards by name, activation, status, or last 4 digits">
      {activeCards.length > 0 ? (
        <List.Section title="Active Cards" subtitle={String(activeCards.length)}>
          {activeCards.map(({ card, uid }) => renderCardItem(card, uid))}
        </List.Section>
      ) : null}

      {inactiveCards.length > 0 ? (
        <List.Section title="Inactive Cards" subtitle={String(inactiveCards.length)}>
          {inactiveCards.map(({ card, uid }) => renderCardItem(card, uid))}
        </List.Section>
      ) : null}

      {!isLoading && visibleCards.length === 0 ? (
        <List.EmptyView title="No cards found" description="No cards are available for this account." />
      ) : null}
    </List>
  );
}

export default function Command() {
  const preferences = getResolvedPreferences();

  if (!preferences.personalAccessToken && !preferences.useDemoData) {
    return <MissingTokenView />;
  }

  return <CardsCommand />;
}
