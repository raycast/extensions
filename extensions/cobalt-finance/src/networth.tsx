import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

import { authorize, logout } from "./oauth";
import { sparklineFile } from "./sparkline";

type Range = "1W" | "1M" | "1Y" | "All";

interface NetWorthResponse {
  totals: {
    checking: number;
    savings: number;
    investments: number;
    credit: number;
    loans: number;
    assets: number;
    liabilities: number;
    netWorth: number;
  };
  history: { date: string; value: number }[];
  asOf: string | null;
}

const usdInt = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

const usd = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const dateDisplay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? iso : dateDisplay.format(new Date(t));
}

function deltaColor(delta: number): Color {
  if (delta > 0) {
    return Color.Green;
  }
  if (delta < 0) {
    return Color.Red;
  }
  return Color.SecondaryText;
}

function deltaSign(delta: number): string {
  if (delta > 0) {
    return "+";
  }
  if (delta < 0) {
    return "−";
  }
  return "";
}

function formatDelta(delta: number): string {
  return `${deltaSign(delta)}${usd.format(Math.abs(delta))}`;
}

function pctChange(current: number, prior: number): string | null {
  if (prior === 0) {
    return null;
  }
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  return `${deltaSign(pct)}${Math.abs(pct).toFixed(1)}%`;
}

const CATEGORY_META: {
  key: keyof NetWorthResponse["totals"];
  label: string;
  icon: Icon;
  color: Color;
  isLiability: boolean;
}[] = [
  {
    color: Color.Blue,
    icon: Icon.Wallet,
    isLiability: false,
    key: "checking",
    label: "Checking",
  },
  {
    color: Color.Purple,
    icon: Icon.Coin,
    isLiability: false,
    key: "savings",
    label: "Savings",
  },
  {
    color: Color.SecondaryText,
    icon: Icon.LineChart,
    isLiability: false,
    key: "investments",
    label: "Investments",
  },
  {
    color: Color.Magenta,
    icon: Icon.CreditCard,
    isLiability: true,
    key: "credit",
    label: "Credit",
  },
  {
    color: Color.Orange,
    icon: Icon.BankNote,
    isLiability: true,
    key: "loans",
    label: "Loans",
  },
];

function buildHeaderAccessories(
  range: Range,
  rangeDelta: number,
  rangePct: string | null,
  dayDelta: number,
  hasHistory: boolean,
): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [
    {
      tag: {
        color: deltaColor(rangeDelta),
        value: `${formatDelta(rangeDelta)}${rangePct ? ` · ${rangePct}` : ""}`,
      },
      tooltip: `Change over ${range}`,
    },
  ];
  if (hasHistory) {
    out.push({
      tag: {
        color: deltaColor(dayDelta),
        value: `1d ${formatDelta(dayDelta)}`,
      },
      tooltip: "Change since prior snapshot",
    });
  }
  return out;
}

function buildCategoryAccessories(
  cat: (typeof CATEGORY_META)[number],
  value: number,
  totalsBase: number,
): List.Item.Accessory[] {
  const pct = totalsBase === 0 ? null : Math.round((value / totalsBase) * 100);
  const out: List.Item.Accessory[] = [];
  if (pct !== null) {
    out.push({
      tag: { color: cat.color, value: `${pct}%` },
      tooltip: cat.isLiability ? "Share of liabilities" : "Share of assets",
    });
  }
  out.push({ text: cat.isLiability ? "Liability" : "Asset" });
  return out;
}

function NetWorthDetail({
  totals,
  history,
  range,
  asOf,
}: {
  totals: NetWorthResponse["totals"];
  history: { date: string; value: number }[];
  range: Range;
  asOf: string | null;
}) {
  const latest = history.at(-1)?.value ?? totals.netWorth;
  const first = history[0]?.value ?? latest;
  const rangeDelta = latest - first;
  const rangePct = pctChange(latest, first);
  const trending = rangeDelta >= 0;
  const sparkPath = sparklineFile(
    history.map((p) => p.value),
    {
      color: trending ? "#22c55e" : "#ef4444",
      height: 160,
      width: 700,
    },
  );
  const chartMd = sparkPath
    ? `![chart](${encodeURI(`file://${sparkPath}`)})\n\n`
    : "";
  const deltaLine = `${trending ? "▲" : "▼"} ${formatDelta(rangeDelta)}${rangePct ? ` · ${rangePct}` : ""} over ${range}`;

  const markdown = [
    `# ${usdInt.format(totals.netWorth)}\n`,
    `${deltaLine}\n`,
    chartMd,
    `**Assets** ${usdInt.format(totals.assets)} · **Liabilities** ${usdInt.format(totals.liabilities)}\n`,
  ].join("");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Net Worth"
            text={usdInt.format(totals.netWorth)}
          />
          <Detail.Metadata.Label
            title={`Change (${range})`}
            text={`${formatDelta(rangeDelta)}${rangePct ? ` · ${rangePct}` : ""}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Checking"
            text={usdInt.format(totals.checking)}
          />
          <Detail.Metadata.Label
            title="Savings"
            text={usdInt.format(totals.savings)}
          />
          <Detail.Metadata.Label
            title="Investments"
            text={usdInt.format(totals.investments)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Credit"
            text={usdInt.format(totals.credit)}
          />
          <Detail.Metadata.Label
            title="Loans"
            text={usdInt.format(totals.loans)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="As of" text={formatDate(asOf)} />
          <Detail.Metadata.Label title="Snapshots" text={`${history.length}`} />
        </Detail.Metadata>
      }
      navigationTitle={`Net Worth · ${range}`}
    />
  );
}

function HeaderSection({
  totals,
  history,
  range,
  asOf,
  revalidate,
  signOutAction,
}: {
  totals: NetWorthResponse["totals"];
  history: { date: string; value: number }[];
  range: Range;
  asOf: string | null;
  revalidate: () => void;
  signOutAction: React.ReactElement;
}) {
  const latest = history.at(-1)?.value ?? totals.netWorth;
  const first = history[0]?.value ?? latest;
  const rangeDelta = latest - first;
  const rangePct = pctChange(latest, first);
  const prior = history.at(-2)?.value ?? latest;
  const dayDelta = latest - prior;

  return (
    <List.Section title="Net Worth" subtitle={formatDate(asOf)}>
      <List.Item
        icon={{ source: Icon.BankNote, tintColor: Color.Green }}
        title={usdInt.format(totals.netWorth)}
        subtitle="Total"
        accessories={buildHeaderAccessories(
          range,
          rangeDelta,
          rangePct,
          dayDelta,
          history.length > 1,
        )}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.LineChart}
              target={
                <NetWorthDetail
                  asOf={asOf}
                  history={history}
                  range={range}
                  totals={totals}
                />
              }
              title="Show Trend"
            />
            <Action.CopyToClipboard
              title="Copy Net Worth"
              content={usdInt.format(totals.netWorth)}
            />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={{ key: "r", modifiers: ["cmd"] }}
              onAction={revalidate}
            />
            {signOutAction}
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
        title={usdInt.format(totals.assets)}
        subtitle="Assets"
        accessories={[{ text: "Checking + Savings + Investments" }]}
      />
      <List.Item
        icon={{ source: Icon.MinusCircle, tintColor: Color.Red }}
        title={usdInt.format(totals.liabilities)}
        subtitle="Liabilities"
        accessories={[{ text: "Credit + Loans" }]}
      />
    </List.Section>
  );
}

function CategoriesSection({
  totals,
  signOutAction,
}: {
  totals: NetWorthResponse["totals"];
  signOutAction: React.ReactElement;
}) {
  return (
    <List.Section title="Categories">
      {CATEGORY_META.map((cat) => {
        const value = totals[cat.key];
        const totalsBase = cat.isLiability ? totals.liabilities : totals.assets;
        return (
          <List.Item
            key={cat.key}
            icon={{ source: cat.icon, tintColor: cat.color }}
            title={cat.label}
            subtitle={usdInt.format(value)}
            accessories={buildCategoryAccessories(cat, value, totalsBase)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Total"
                  content={usdInt.format(value)}
                />
                {signOutAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function HistorySection({
  history,
  signOutAction,
}: {
  history: { date: string; value: number }[];
  signOutAction: React.ReactElement;
}) {
  const reversed = [...history].toReversed().slice(0, 30);
  return (
    <List.Section title="History" subtitle={`${history.length} snapshots`}>
      {reversed.map((point, i, arr) => {
        const prev = arr[i + 1]?.value ?? point.value;
        const d = point.value - prev;
        return (
          <List.Item
            key={point.date}
            icon={Icon.Calendar}
            title={formatDate(point.date)}
            subtitle={usdInt.format(point.value)}
            accessories={[
              { tag: { color: deltaColor(d), value: formatDelta(d) } },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  content={usdInt.format(point.value)}
                />
                {signOutAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

export default function Command() {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("1Y");

  useEffect(() => {
    const run = async () => {
      try {
        const token = await authorize(base);
        setAccessToken(token);
      } catch (error) {
        showFailureToast(error, { title: "Sign-in failed" });
      }
    };
    void run();
  }, [base]);

  const { isLoading, data, revalidate, error } = useFetch(
    `${base}/v1/networth?range=${range}`,
    {
      execute: !!accessToken,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      keepPreviousData: true,
      mapResult(result: NetWorthResponse) {
        return { data: result };
      },
    },
  );

  const signOutAction = (
    <Action
      title="Sign out"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
      onAction={async () => {
        await logout();
        setAccessToken(null);
      }}
    />
  );

  const rangeDropdown = (
    <List.Dropdown
      tooltip="Time range"
      value={range}
      onChange={(v) => setRange(v as Range)}
    >
      <List.Dropdown.Item title="1 Week" value="1W" />
      <List.Dropdown.Item title="1 Month" value="1M" />
      <List.Dropdown.Item title="1 Year" value="1Y" />
      <List.Dropdown.Item title="All" value="All" />
    </List.Dropdown>
  );

  const totals = data?.totals;
  const history = data?.history ?? [];
  const showEmpty =
    !isLoading && !error && accessToken && totals && history.length === 0;

  return (
    <List
      isLoading={isLoading || !accessToken}
      searchBarPlaceholder="Filter"
      searchBarAccessory={rangeDropdown}
      actions={<ActionPanel>{signOutAction}</ActionPanel>}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load net worth"
          description={error.message}
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}

      {totals ? (
        <HeaderSection
          asOf={data?.asOf ?? null}
          history={history}
          range={range}
          revalidate={revalidate}
          signOutAction={signOutAction}
          totals={totals}
        />
      ) : null}

      {totals ? (
        <CategoriesSection signOutAction={signOutAction} totals={totals} />
      ) : null}

      {history.length > 0 ? (
        <HistorySection history={history} signOutAction={signOutAction} />
      ) : null}

      {showEmpty ? (
        <List.EmptyView
          icon={Icon.LineChart}
          title="No snapshot history yet"
          description="Connect a bank or brokerage in Cobalt to start tracking net worth over time."
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}
