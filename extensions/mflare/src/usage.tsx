import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import {
  ConnectionActions,
  ConnectionForm,
  connectionProblem,
  ErrorView,
  NoAccountsView,
  QUIET,
  REAUTHORIZE_NOTE,
  useAccountSelection,
} from "./components";
import { AccountUsage, getUsage, openMFlare, Service, UsageItem } from "./mflare";

const SERVICE_NAMES: Record<Service, string> = {
  workers: "Workers",
  durable_objects: "Durable Objects",
  kv: "KV",
  r2: "R2",
  d1: "D1",
};

const METRIC_TITLES: Record<string, string> = {
  requests: "Requests",
  buildMinutes: "Build Minutes",
  observabilityEvents: "Observability Events",
  classA: "Class A Operations",
  classB: "Class B Operations",
  storage: "Storage",
  rowsRead: "Rows Read",
  rowsWritten: "Rows Written",
  reads: "Reads",
  writes: "Writes",
  deletes: "Deletes",
  lists: "Lists",
  duration: "Duration",
};

const ERROR_REASONS: Record<string, string> = {
  rate_limited: "rate limited",
};

export default function Command() {
  const { accounts, accountId, isReady, hasNoAccounts, needsReauthorization, dropdown } = useAccountSelection();
  const usage = usePromise(getUsage, [accountId], { execute: isReady, ...QUIET });

  // A Usage error counts only while there's an Account to read it for: without one, the Usage isn't read.
  const error = accounts.error ?? (isReady ? usage.error : undefined);
  const data = usage.data;
  // Reads the Accounts again, and the Usage when there's an Account, e.g. once the connection changes. revalidate
  // reads even with `execute` off, so it's only called then; a new Account starts the read on its own.
  const reload = () => {
    accounts.revalidate();
    if (isReady) usage.revalidate();
  };

  // Without a connection MFlare takes, there's nothing to list: ask for one right away.
  const problem = connectionProblem(error);
  if (problem) return <ConnectionForm problem={problem} onConnected={reload} />;

  return (
    <List
      isLoading={accounts.isLoading || usage.isLoading}
      searchBarPlaceholder="Search usage…"
      searchBarAccessory={dropdown}
    >
      {error ? (
        <ErrorView error={error} failedTitle="Couldn't load Usage" onRetry={reload} />
      ) : hasNoAccounts ? (
        <NoAccountsView onRetry={reload} />
      ) : data?.items.length === 0 ? (
        <List.EmptyView
          icon={Icon.BarChart}
          title={data.fetched_at ? "No Usage to show" : "No Usage yet"}
          description={
            data.fetched_at
              ? "Every Service is hidden in MFlare. Show the ones you want in its Settings › Display."
              : "MFlare hasn't fetched this Account's Usage yet. Try again in a moment."
          }
          actions={
            <ActionPanel>
              <Action
                title="Open in MFlare"
                icon={Icon.AppWindow}
                onAction={() => openMFlare({ page: "usage", accountId: data.account_id })}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={reload}
              />
              <ConnectionActions onChange={reload} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {data &&
            servicesInOrder(data.items).map((service, index) => {
              const items = data.items.filter((item) => item.service === service);
              return (
                <List.Section
                  key={service}
                  title={SERVICE_NAMES[service] ?? service}
                  subtitle={sectionSubtitle(data, service, index === 0, needsReauthorization)}
                >
                  {items.map((item) => (
                    <UsageRow key={item.id} item={item} usage={data} onRefresh={reload} />
                  ))}
                </List.Section>
              );
            })}
        </>
      )}
    </List>
  );
}

function UsageRow({ item, usage, onRefresh }: { item: UsageItem; usage: AccountUsage; onRefresh: () => void }) {
  const color = levelColor(item);
  const accessories: List.Item.Accessory[] = [{ text: amountText(item) }];
  if (item.percent !== null) {
    accessories.push({
      tag: { value: `${formatPercent(item.percent)}%`, color: color ?? Color.SecondaryText },
      tooltip: overageText(item),
    });
  }

  return (
    <List.Item
      icon={usageIcon(item, color)}
      title={METRIC_TITLES[item.metric] ?? titleCase(item.metric)}
      subtitle={periodText(item)}
      keywords={[item.id, item.service]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open in MFlare"
            icon={Icon.AppWindow}
            onAction={() => openMFlare({ page: "usage", accountId: usage.account_id })}
          />
          <Action.OpenInBrowser
            title="Open Cloudflare Dashboard"
            url={`https://dash.cloudflare.com/${usage.account_id}`}
          />
          <Action.CopyToClipboard
            title="Copy Usage"
            content={`${METRIC_TITLES[item.metric] ?? item.metric}: ${amountText(item)}`}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <ConnectionActions onChange={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

// The Services in the order MFlare lists their Usage, which follows its Settings › Display. Hidden Services have no
// items, so they don't show.
function servicesInOrder(items: UsageItem[]): Service[] {
  return [...new Set(items.map((item) => item.service))];
}

// A failed refresh, or else on the first Service when the Usage was fetched, and that it can't be refreshed until the
// User signs in again: the root command keeps its navigation title, as the Store asks.
function sectionSubtitle(
  usage: AccountUsage,
  service: Service,
  isFirst: boolean,
  needsReauthorization: boolean,
): string | undefined {
  const error = usage.errors?.[service];
  if (error) return `Couldn't refresh (${ERROR_REASONS[error] ?? error})`;
  if (!isFirst) return undefined;
  const fetched = capitalize(fetchedText(usage.fetched_at));
  return needsReauthorization ? `${fetched} · ${REAUTHORIZE_NOTE}` : fetched;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// How full the Quota is, colored by its level, so a glance down the list finds what needs attention. Usage without a
// Quota has nothing to fill.
function usageIcon(item: UsageItem, color: Color | undefined): List.Item.Props["icon"] {
  if (item.percent === null) return { source: Icon.Circle, tintColor: Color.SecondaryText };
  return getProgressIcon(Math.min(item.percent, 100) / 100, color ?? Color.Orange);
}

function levelColor(item: UsageItem): Color | undefined {
  if (item.level === "exceeded") return Color.Red;
  if (item.level === "warning") return Color.Yellow;
  return undefined;
}

function periodText(item: UsageItem): string {
  if (!item.resets) return "Current size";
  return item.period.kind === "daily" ? "Daily" : "Monthly";
}

function amountText(item: UsageItem): string {
  const used = formatValue(item.used, item.unit);
  return item.quota === null ? used : `${used} / ${formatValue(item.quota, item.unit)}`;
}

function overageText(item: UsageItem): string | undefined {
  if (item.estimated_overage_cost === null) return undefined;
  return `Estimated overage: ${item.estimated_overage_cost.toLocaleString("en-US", { style: "currency", currency: "USD" })}`;
}

function formatValue(value: number, unit: UsageItem["unit"]): string {
  switch (unit) {
    case "bytes":
      return formatBytes(value);
    case "minutes":
      return `${formatNumber(value, 1)} min`;
    case "milliseconds":
      return `${formatNumber(value, 0)} ms`;
    case "gigabyte_seconds":
      return `${formatNumber(value, 1)} GB-s`;
    default:
      return formatNumber(value, 0);
  }
}

// Cloudflare counts storage in decimal units: the 10 GB R2 Quota is 10,000,000,000 bytes.
function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000;
    index += 1;
  }
  return `${formatNumber(value, index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatNumber(value: number, fractionDigits: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits });
}

function formatPercent(percent: number): string {
  return percent < 10 && percent > 0 ? percent.toFixed(1) : Math.round(percent).toString();
}

function titleCase(metric: string): string {
  const words = metric.replace(/([a-z])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fetchedText(fetchedAt: string | null): string {
  if (!fetchedAt) return "not fetched yet";
  const minutes = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000);
  if (minutes < 1) return "fetched just now";
  if (minutes < 60) return `fetched ${minutes} min ago`;
  return `fetched ${Math.round(minutes / 60)} h ago`;
}
