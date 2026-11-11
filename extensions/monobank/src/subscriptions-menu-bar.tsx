import {
  Clipboard,
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment } from "react";
import { getTokenError, getTokenFingerprint } from "./api/monobank";
import MenuBarFooter, {
  ConfigureCommandItem,
  OpenCommandItem,
  openCommand,
  relaunchCommand,
} from "./components/MenuBarFooter";
import { RATES_TTL } from "./data/constants";
import { shortcuts } from "./data/shortcuts";
import { fetchClientInfo } from "./services/clientInfo";
import { getDisplayNames } from "./services/format";
import { loadRates } from "./services/rates";
import { getHistoryCutoff } from "./services/statement";
import { detectStoredSubscriptions, getHistoryStart } from "./services/subscriptions";
import { Currency, Subscription } from "./types";
import {
  formatAmount,
  formatCadence,
  formatDate,
  formatHryvnias,
  formatNextDate,
  formatPlainAmount,
  getMonthlyTotal,
  getSubscriptionMenuBarTitle,
  getSubscriptionTitle,
  isUpcoming,
} from "./utils";

/** A subscription with only what the menu shows, so the cached data stays small (no charges or accounts). */
interface MenuSubscription {
  key: string;
  title: string;
  cadence: Subscription["cadence"];
  status: Subscription["status"];
  amount: number;
  currency: Currency;
  nextDate: number;
  accountId: string;
  accountName?: string;
  icon: Icon;
}

/** History that starts more than a day after where "Sync Statements" loads it to is still loading. */
const HISTORY_SLACK = 86_400;

/**
 * The visible subscriptions of the token identified by `scope`, found in the stored statements, with their monthly
 * total in UAH. Makes no statement requests. The scope is part of the arguments, so Raycast's cache of one token's
 * subscriptions is never shown for another token.
 */
async function loadMenuSubscriptions(scope: string) {
  const now = Date.now();
  const loaded = await fetchClientInfo();
  const { subscriptions, statements } = await detectStoredSubscriptions(loaded, now);
  const visible = subscriptions.filter((subscription) => !subscription.hidden);
  const names = getDisplayNames(loaded.items);

  let monthlyTotal: number | undefined;
  try {
    const { rates } = await loadRates(RATES_TTL);
    monthlyTotal = getMonthlyTotal(
      visible.filter((subscription) => subscription.status === "active"),
      rates,
    );
  } catch (error) {
    // Rates only add the total.
    console.error(error);
  }

  const synced = statements.filter(({ statement }) => statement.syncedAt > 0);
  const cutoff = getHistoryCutoff(now);
  const starts = synced.map(({ statement }) => ({
    start: getHistoryStart(statement),
    target: Math.max(cutoff, statement.historyFrom ?? 0),
  }));
  const knownStarts = starts.map(({ start }) => start).filter((start): start is number => start !== undefined);

  return {
    subscriptions: visible.map((subscription): MenuSubscription => ({
      key: subscription.key,
      title: getSubscriptionTitle(subscription),
      cadence: subscription.cadence,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      nextDate: subscription.nextDate,
      accountId: subscription.account.id,
      accountName: names.get(subscription.account.id),
      icon: subscription.category.icon,
    })),
    monthlyTotal,
    hasHistory: synced.some(({ statement }) => statement.items.length > 0),
    historySince: knownStarts.length ? Math.max(...knownStarts) : undefined,
    isPartial: starts.some(({ start, target }) => start === undefined || start > target + HISTORY_SLACK),
    oldestSyncedAt: synced.length ? Math.min(...synced.map(({ statement }) => statement.syncedAt)) : undefined,
    stale: loaded.stale,
    scope,
  };
}

function openSubscription(key: string) {
  return openCommand("subscriptions", { selectedKey: key });
}

async function copy(text: string) {
  await Clipboard.copy(text);
  await showHUD("Copied to Clipboard");
}

async function syncStatements() {
  try {
    await launchCommand({ name: "sync-statements", type: LaunchType.Background });
    await showHUD("Syncing statements in the background");
  } catch (error) {
    console.error(error);
    await showHUD('Enable the "Sync Statements" command to load your history');
  }
}

export default function Command() {
  const { token, subscriptionsTitle } = getPreferenceValues<Preferences.SubscriptionsMenuBar>();
  const scope = getTokenFingerprint(token);
  // Raycast unloads a menu bar command once `isLoading` is false, so the loader does all async work.
  const { data: loaded, isLoading, error } = useCachedPromise(loadMenuSubscriptions, [scope]);
  const tokenError = getTokenError(error);
  // Without a token monobank accepts, cached subscriptions can't be confirmed to belong to the user.
  const data = !tokenError && loaded?.scope === scope ? loaded : undefined;
  const now = new Date();

  if (tokenError) {
    return (
      <MenuBarExtra icon={Icon.Key} tooltip="monobank Subscriptions" isLoading={isLoading}>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={tokenError === "missing" ? "Add Access Token…" : "Invalid Access Token…"}
            icon={Icon.Key}
            tooltip="Open the extension preferences"
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <ConfigureCommandItem />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const subscriptions = data?.subscriptions ?? [];

  if (!subscriptions.length) {
    // Nothing found, failed with nothing cached, or still loading for the first time.
    return (
      <MenuBarExtra icon={error ? Icon.Warning : Icon.Repeat} tooltip="monobank Subscriptions" isLoading={isLoading}>
        {data &&
          (data.hasHistory ? (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item title="No Subscriptions Found" />
            </MenuBarExtra.Section>
          ) : (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item title="No Statement History Yet" />
              <MenuBarExtra.Item title="Sync Statements" icon={Icon.ArrowClockwise} onAction={syncStatements} />
            </MenuBarExtra.Section>
          ))}
        {error && (
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Couldn't Load Subscriptions" subtitle="Try Again" onAction={relaunchCommand} />
          </MenuBarExtra.Section>
        )}
        <MenuBarExtra.Section>
          <OpenCommandItem title="Open Subscriptions" command="subscriptions" shortcut={shortcuts.open} />
          <ConfigureCommandItem />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const upcoming = subscriptions
    .filter((subscription) => isUpcoming(subscription, now))
    .sort((a, b) => a.nextDate - b.nextDate);
  const active = subscriptions
    .filter((subscription) => subscription.status === "active" && !isUpcoming(subscription, now))
    .sort((a, b) => a.nextDate - b.nextDate);
  const late = subscriptions.filter((subscription) => subscription.status === "late");
  const sections = [
    { title: "Upcoming", items: upcoming },
    { title: "Active", items: active },
    { title: "Possibly Cancelled", items: late },
  ].filter((section) => section.items.length > 0);

  // The card is only worth naming when subscriptions come from more than one account.
  const showsCard = new Set(subscriptions.map((subscription) => subscription.accountId)).size > 1;
  const monthlyTotal = data?.monthlyTotal;
  const historyNote =
    data?.isPartial && data.historySince !== undefined
      ? `History since ${formatDate(new Date(data.historySince * 1000))} · still loading`
      : undefined;

  const renderSubscription = (subscription: MenuSubscription) => {
    const amount = formatAmount(subscription.amount, subscription.currency);
    const when =
      subscription.status === "late" ? formatCadence(subscription.cadence) : formatNextDate(subscription, now);
    return (
      <MenuBarExtra.Item
        key={subscription.key}
        icon={subscription.icon}
        title={subscription.title}
        subtitle={`${amount} · ${when}`}
        tooltip={[formatCadence(subscription.cadence), showsCard && subscription.accountName]
          .filter(Boolean)
          .join(" · ")}
        onAction={() => openSubscription(subscription.key)}
        alternate={
          <MenuBarExtra.Item
            icon={Icon.Clipboard}
            title={subscription.title}
            subtitle={`Copy ${amount}`}
            onAction={() => copy(formatPlainAmount(subscription.amount, subscription.currency))}
          />
        }
      />
    );
  };

  return (
    <MenuBarExtra
      icon={Icon.Repeat}
      title={getSubscriptionMenuBarTitle(subscriptions, monthlyTotal, subscriptionsTitle, now)}
      tooltip="monobank Subscriptions"
      isLoading={isLoading}
    >
      {/*
        Keyed by what's listed, so a changed list rebuilds these sections. When they're updated in place, the menu
        bar misdraws the changed items: titles go missing and inserted items are indented.
      */}
      <Fragment key={sections.map((section) => section.items.map((item) => item.key).join()).join("|")}>
        {(monthlyTotal !== undefined || historyNote) && (
          <MenuBarExtra.Section>
            {monthlyTotal !== undefined && (
              <MenuBarExtra.Item
                title="Per Month"
                subtitle={`≈ ${formatHryvnias(monthlyTotal)}`}
                icon={Icon.Coins}
                tooltip="Copy the monthly total of active subscriptions"
                shortcut={shortcuts.copyTotal}
                onAction={() => copy(String(Math.round(monthlyTotal)))}
              />
            )}
            {historyNote && <MenuBarExtra.Item title={historyNote} icon={Icon.Hourglass} />}
          </MenuBarExtra.Section>
        )}

        {sections.map((section) => (
          <MenuBarExtra.Section key={section.title} title={section.title}>
            {section.items.map(renderSubscription)}
          </MenuBarExtra.Section>
        ))}
      </Fragment>

      <MenuBarFooter
        updatedAt={data?.oldestSyncedAt}
        offline={data?.stale || !!error}
        openTitle="Open Subscriptions"
        command="subscriptions"
        openShortcut={shortcuts.open}
      />
    </MenuBarExtra>
  );
}
