import { Action, ActionPanel, Color, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ReactNode, useEffect, useState } from "react";
import { HISTORY_SYNC_MONTHS_UNLIMITED, accountTypeColors } from "../../data/constants";
import { shortcuts } from "../../data/shortcuts";
import { useAccountStatements, useClientInfo, useCurrencyRates, useSubscriptions } from "../../hooks";
import { getRetentionMonths } from "../../services/statement";
import { Period, Subscription } from "../../types";
import {
  formatAmount,
  formatCadence,
  formatDate,
  formatDateTime,
  formatHryvnias,
  formatNextDate,
  formatPlainAmount,
  formatSyncTime,
  getMonthlyTotal,
  getStatementItemTitle,
  getSubscriptionTitle,
  isUpcoming,
} from "../../utils";
import StatementView from "../statement/StatementView";
import TokenErrorEmptyView, { showInvalidTokenToast } from "../TokenErrorEmptyView";
import RenameSubscriptionForm from "./RenameSubscriptionForm";

const { Metadata } = List.Item.Detail;

const LAST_31_DAYS: Period = { preset: "last31Days" };

/**
 * Recurring charges found in the stored statements of every card and FOP account. Opening it makes no statement
 * requests: "Sync Statements" loads the history, and Refresh updates the last 31 days. `selectedKey` selects that
 * subscription, e.g. from "Show in Subscriptions" in a statement. `navigationTitle` is only for a pushed view: the
 * command's own title shows at the root.
 */
export default function SubscriptionsView(props: { selectedKey?: string; navigationTitle?: string }) {
  const { selectedKey, navigationTitle } = props;
  const [now] = useState(() => new Date());
  const clientInfo = useClientInfo();
  // Cards and FOP accounts. Jars are never charged for subscriptions.
  const accounts = clientInfo.isLoadingFromStorage ? undefined : clientInfo.data.accounts;

  // Reads the stored history only.
  const {
    subscriptions,
    history,
    isLoading: isLoadingSubscriptions,
    update,
    restorePriceChange,
    setHidden,
  } = useSubscriptions(accounts, now);
  // Only for Refresh: it updates the last 31 days, and the history above reads them again.
  const recent = useAccountStatements(accounts, LAST_31_DAYS, { label: "subscriptions" });

  const { data: rates } = useCurrencyRates();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [isShowingHidden, setIsShowingHidden] = useState(false);

  const tokenError = clientInfo.tokenError ?? history.tokenError ?? recent.tokenError;
  useEffect(() => {
    if (tokenError === "invalid") showInvalidTokenToast();
  }, [tokenError]);

  const visible = subscriptions.filter((subscription) => !subscription.hidden);
  const hidden = subscriptions.filter((subscription) => subscription.hidden);
  const upcoming = visible.filter((subscription) => isUpcoming(subscription, now));
  const active = visible.filter((subscription) => subscription.status === "active" && !isUpcoming(subscription, now));
  const late = visible.filter((subscription) => subscription.status === "late");

  const monthlyTotal = getMonthlyTotal(
    visible.filter((subscription) => subscription.status === "active"),
    rates,
  );
  // The card tag is only needed when subscriptions come from more than one account.
  const showsCard = new Set(visible.map((subscription) => subscription.account.id)).size > 1;

  const syncedGroups = history.groups.filter((group) => group.syncedAt > 0);
  const hasHistory = syncedGroups.some((group) => group.transactions.length > 0);
  const historySince = syncedGroups.length ? Math.max(...syncedGroups.map((group) => group.loadedSince)) : undefined;
  const isLoading = clientInfo.isLoading || isLoadingSubscriptions || recent.isLoading || accounts === undefined;

  function getNote() {
    if (tokenError) return undefined;
    if (history.isPartial && historySince !== undefined) {
      return `History since ${formatDate(new Date(historySince * 1000))} · still loading`;
    }
    if (history.oldestSyncedAt !== undefined) return formatSyncTime(history.oldestSyncedAt, now);
    return undefined;
  }

  const firstSubtitle = [monthlyTotal !== undefined && `≈ ${formatHryvnias(monthlyTotal)}/month`, getNote()]
    .filter(Boolean)
    .join(" · ");
  const sections = [
    { title: "Upcoming", items: upcoming },
    { title: "Active", items: active },
    { title: "Possibly Cancelled", items: late },
    ...(isShowingHidden ? [{ title: "Hidden", items: hidden }] : []),
  ].filter((section) => section.items.length > 0);

  async function confirmPriceChange(subscription: Subscription) {
    if (!subscription.newPriceChargeId) return;
    await update(subscription, { confirmPriceChange: subscription.newPriceChargeId });
    await showToast(
      Toast.Style.Success,
      "New Price Confirmed",
      `${getSubscriptionTitle(subscription)}: ${formatAmount(subscription.amount, subscription.currency)}`,
    );
  }

  async function rejectPriceChange(subscription: Subscription) {
    const chargeId = subscription.newPriceChargeId;
    if (!chargeId || subscription.previousAmount === undefined) return;
    await update(subscription, { rejectPriceChange: chargeId });
    await showToast({
      style: Toast.Style.Success,
      title: "Not a Price Change",
      message: `${getSubscriptionTitle(subscription)} stays at ${formatAmount(subscription.previousAmount, subscription.currency)}`,
      primaryAction: {
        title: "Undo",
        onAction: async (toast) => {
          await restorePriceChange(chargeId);
          await toast.hide();
        },
      },
    });
  }

  async function restoreRejectedPriceChange(subscription: Subscription) {
    const rejected = subscription.rejectedPriceChange;
    if (!rejected) return;
    await restorePriceChange(rejected.chargeId);
    await showToast(
      Toast.Style.Success,
      "Price Change Restored",
      `${getSubscriptionTitle(subscription)}: ${formatAmount(rejected.amount, subscription.currency)} since ${formatDate(new Date(rejected.time * 1000))}`,
    );
  }

  /** `actionsBefore`: how many actions come before them. The first two take ⏎ and ⌘⏎ instead of shortcuts. */
  const renderCommonActions = (actionsBefore: number) => {
    const hasHiddenAction = hidden.length > 0;
    return (
      <>
        {hasHiddenAction && (
          <Action
            title={isShowingHidden ? "Hide Hidden Subscriptions" : `Show Hidden Subscriptions (${hidden.length})`}
            icon={isShowingHidden ? Icon.EyeDisabled : Icon.Eye}
            shortcut={actionsBefore >= 2 ? shortcuts.showHidden : undefined}
            onAction={() => setIsShowingHidden((value) => !value)}
          />
        )}
        {!tokenError && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={actionsBefore + Number(hasHiddenAction) >= 2 ? shortcuts.refresh : undefined}
            onAction={recent.refresh}
          />
        )}
      </>
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && sections.length > 0}
      selectedItemId={selectedKey}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search subscriptions"
    >
      {tokenError ? (
        <TokenErrorEmptyView tokenError={tokenError} purpose="see your subscriptions" />
      ) : (
        !isLoading && (
          <EmptyView
            hasHistory={hasHistory}
            historySince={historySince}
            now={now}
            renderActions={renderCommonActions}
          />
        )
      )}

      {sections.map((section, index) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={index === 0 ? firstSubtitle || undefined : undefined}
        >
          {section.items.map((subscription) => {
            const hasPriceQuestion = !!subscription.newPriceChargeId && subscription.previousAmount !== undefined;
            // The actions before "Open Statement": the first two take ⏎ and ⌘⏎ instead of their shortcuts.
            const actionsBefore = (hasPriceQuestion ? 2 : 0) + (subscription.rejectedPriceChange ? 1 : 0);
            return (
              <List.Item
                key={subscription.key}
                id={subscription.key}
                icon={subscription.category.icon}
                title={getSubscriptionTitle(subscription)}
                subtitle={isShowingDetail ? undefined : formatCadence(subscription.cadence)}
                keywords={[subscription.name, subscription.category.name, subscription.category.nameUk]}
                accessories={getAccessories(subscription, showsCard, isShowingDetail, now)}
                detail={<SubscriptionDetail subscription={subscription} />}
                actions={
                  <ActionPanel>
                    {hasPriceQuestion && (
                      <ActionPanel.Section
                        title={`Is ${formatAmount(subscription.amount, subscription.currency)} the New Price?`}
                      >
                        <Action
                          title="Confirm New Price"
                          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                          onAction={() => confirmPriceChange(subscription)}
                        />
                        <Action
                          title="Not a Price Change"
                          icon={Icon.XMarkCircle}
                          onAction={() => rejectPriceChange(subscription)}
                        />
                      </ActionPanel.Section>
                    )}
                    {subscription.rejectedPriceChange && (
                      <ActionPanel.Section title={getRejectedPriceChangeText(subscription)}>
                        <Action
                          title="It Was a Price Change"
                          icon={Icon.ArrowCounterClockwise}
                          onAction={() => restoreRejectedPriceChange(subscription)}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section>
                      <Action.Push
                        title="Open Statement"
                        icon={Icon.List}
                        shortcut={actionsBefore >= 2 ? shortcuts.viewStatement : undefined}
                        target={<StatementView account={subscription.account} />}
                      />
                      <Action
                        title="Toggle Details"
                        icon={Icon.Sidebar}
                        shortcut={actionsBefore >= 1 ? shortcuts.toggleDetails : undefined}
                        onAction={() => setIsShowingDetail((value) => !value)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Amount"
                        content={formatPlainAmount(subscription.amount, subscription.currency)}
                        shortcut={shortcuts.copyAmount}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Rename…"
                        icon={Icon.Pencil}
                        shortcut={shortcuts.edit}
                        target={<RenameSubscriptionForm subscription={subscription} onRename={update} />}
                      />
                      {subscription.hidden ? (
                        <Action
                          title="Unhide"
                          icon={Icon.Eye}
                          shortcut={shortcuts.remove}
                          onAction={() => setHidden(subscription, false)}
                        />
                      ) : (
                        <Action
                          title="Not a Subscription"
                          icon={Icon.EyeDisabled}
                          style={Action.Style.Destructive}
                          shortcut={shortcuts.remove}
                          onAction={() => setHidden(subscription, true)}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>{renderCommonActions(Infinity)}</ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function EmptyView(props: {
  hasHistory: boolean;
  historySince?: number;
  now: Date;
  renderActions: (actionsBefore: number) => ReactNode;
}) {
  const { hasHistory, historySince, now, renderActions } = props;
  const months = getRetentionMonths() ?? HISTORY_SYNC_MONTHS_UNLIMITED;

  return hasHistory ? (
    <List.EmptyView
      icon={Icon.Repeat}
      title="No Subscriptions Found"
      description={`No recurring charges found since ${formatDate(new Date((historySince ?? now.getTime() / 1000) * 1000), { year: true })}.`}
      actions={<ActionPanel>{renderActions(0)}</ActionPanel>}
    />
  ) : (
    <List.EmptyView
      icon={Icon.Repeat}
      title="No History Yet"
      description={`"Sync Statements" loads up to ${months} ${months === 1 ? "month" : "months"} of history. Subscriptions show once a merchant charges at least twice.`}
      actions={
        <ActionPanel>
          <Action title="Run Sync Statements" icon={Icon.ArrowClockwise} onAction={runSyncStatements} />
          {renderActions(1)}
        </ActionPanel>
      }
    />
  );
}

async function runSyncStatements() {
  try {
    await launchCommand({ name: "sync-statements", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, {
      title: "Couldn't run Sync Statements",
      message: 'Enable the "Sync Statements" command in Raycast Settings and try again.',
    });
  }
}

function getAccessories(
  subscription: Subscription,
  showsCard: boolean,
  isShowingDetail: boolean,
  now: Date,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const nextDate = formatDate(new Date(subscription.nextDate * 1000), { weekday: true, year: true });

  if (!isShowingDetail) {
    if (subscription.newPriceChargeId && subscription.previousAmount !== undefined) {
      accessories.push({
        tag: { value: "New Price?", color: Color.Orange },
        tooltip: `${getPriceChangeQuestion(subscription)} Confirm it in the actions.`,
      });
    } else if (subscription.confidence === "likely") {
      accessories.push({
        tag: { value: "Likely", color: Color.SecondaryText },
        tooltip: "Charged twice so far, by a merchant that usually charges for subscriptions",
      });
    }
    if (showsCard) {
      const { account } = subscription;
      accessories.push({ tag: { value: getStatementItemTitle(account), color: accountTypeColors[account.type] } });
    }
  }

  accessories.push({ text: formatAmount(subscription.amount, subscription.currency) });
  accessories.push(
    subscription.status === "late"
      ? {
          text: { value: formatNextDate(subscription, now), color: Color.Red },
          tooltip: `Not charged since ${formatDate(new Date(subscription.lastCharge * 1000))}: possibly cancelled`,
        }
      : { text: formatNextDate(subscription, now), tooltip: `Next charge expected ${nextDate}` },
  );

  return accessories;
}

function SubscriptionDetail(props: { subscription: Subscription }) {
  const { subscription } = props;
  const { amount, currency, previousAmount, monthlyCost, account, category } = subscription;
  const isLate = subscription.status === "late";
  const nextDate = formatDate(new Date(subscription.nextDate * 1000), { weekday: true, year: true });

  return (
    <List.Item.Detail
      metadata={
        // Keys include the text, so Raycast recreates a label whose text changed instead of truncating it.
        <Metadata>
          <Metadata.Label
            key={`amount:${amount}:${previousAmount}`}
            title="Amount"
            text={
              previousAmount !== undefined
                ? `${formatAmount(amount, currency)} · was ${formatAmount(previousAmount, currency)}`
                : formatAmount(amount, currency)
            }
          />
          {currency.code !== account.currency.code && (
            <Metadata.Label
              key={`accountAmount:${subscription.accountAmount}`}
              title="Last Charged"
              text={formatAmount(subscription.accountAmount, account.currency)}
            />
          )}
          {subscription.priceChangedAt !== undefined && (
            <Metadata.Label
              key={`priceChange:${subscription.priceChangedAt}:${!!subscription.newPriceChargeId}`}
              title="Price Changed"
              text={
                subscription.newPriceChargeId
                  ? {
                      value: `${formatDate(new Date(subscription.priceChangedAt * 1000))} · not confirmed`,
                      color: Color.Orange,
                    }
                  : formatDate(new Date(subscription.priceChangedAt * 1000), { year: true })
              }
            />
          )}
          {subscription.rejectedPriceChange && (
            <Metadata.Label
              key={`rejected:${subscription.rejectedPriceChange.chargeId}`}
              title="Not a Price Change"
              text={getRejectedPriceChangeText(subscription)}
            />
          )}
          <Metadata.Label title="Cadence" text={formatCadence(subscription.cadence)} />
          <Metadata.Label
            key={`next:${subscription.nextDate}:${subscription.status}`}
            title={isLate ? "Was Expected" : "Next Charge"}
            text={isLate ? { value: `${nextDate} · possibly cancelled`, color: Color.Red } : nextDate}
          />
          <Metadata.Separator />
          <Metadata.Label key={`monthly:${monthlyCost}`} title="Per Month" text={formatAmount(monthlyCost, currency)} />
          <Metadata.Label
            key={`yearly:${monthlyCost}`}
            title="Per Year"
            text={formatAmount(monthlyCost * 12, currency)}
          />
          <Metadata.Separator />
          <Metadata.Label
            key={`card:${account.id}`}
            title="Card"
            icon={Icon.CreditCard}
            text={getStatementItemTitle(account)}
          />
          <Metadata.Label
            key={`category:${category.name}`}
            title="Category"
            icon={category.icon}
            text={category.name}
          />
          <Metadata.Label
            key={`confidence:${subscription.confidence}`}
            title="Confidence"
            text={subscription.confidence === "confirmed" ? "Confirmed" : "Likely: charged twice so far"}
          />
          {subscription.customName && (
            <Metadata.Label key={`merchant:${subscription.name}`} title="Merchant" text={subscription.name} />
          )}
          <Metadata.Separator />
          <Metadata.Label title="Charges" />
          {subscription.charges.map((charge) => (
            <Metadata.Label
              key={charge.id}
              title={formatDateTime(charge.time)}
              text={formatAmount(Math.abs(charge.operationAmount), charge.operationCurrency)}
            />
          ))}
        </Metadata>
      }
    />
  );
}

/** E.g. "Charged 299.00 ₴ instead of 149.00 ₴ on 13 Oct. Is this the new price?" */
function getPriceChangeQuestion(subscription: Subscription) {
  const { amount, previousAmount, currency, priceChangedAt } = subscription;
  const date = priceChangedAt !== undefined ? ` on ${formatDate(new Date(priceChangedAt * 1000))}` : "";
  return `Charged ${formatAmount(amount, currency)} instead of ${formatAmount(previousAmount ?? 0, currency)}${date}. Is this the new price?`;
}

/** E.g. "299.00 ₴ on 13 Oct": the charge the user said isn't a price change. */
function getRejectedPriceChangeText(subscription: Subscription) {
  const rejected = subscription.rejectedPriceChange;
  if (!rejected) return "";
  return `${formatAmount(rejected.amount, subscription.currency)} on ${formatDate(new Date(rejected.time * 1000))}`;
}
