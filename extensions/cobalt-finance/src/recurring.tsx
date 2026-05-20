import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Image,
  List,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

import { categoryIcon, pickInstitutionIcon, pickRecurringIcon } from "./icons";
import { authorize, logout } from "./oauth";

interface RecurringStream {
  id: string;
  streamId: string | null;
  description: string | null;
  merchantName: string | null;
  category: { primary?: string | null } | string | null;
  categoryDetail: string | null;
  categoryConfidence: string | null;
  frequency: string | null;
  status: string | null;
  streamType: string | null;
  isActive: boolean | null;
  firstDate: string | null;
  lastDate: string | null;
  predictedNextDate: string | null;
  averageAmount: number;
  lastAmount: number;
  transactionIds: string[] | null;
  accountName: string | null;
  accountType: string | null;
  accountSubtype: string | null;
  institutionLogo: string | null;
  institutionName: string | null;
  institutionUrl: string | null;
  updatedAt: string | null;
}

interface RecurringResponse {
  streams: RecurringStream[];
}

const currency = new Intl.NumberFormat("en-US", {
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
  const day = String(iso).split("T")[0] ?? String(iso);
  const t = new Date(`${day}T12:00:00.000Z`).getTime();
  return Number.isNaN(t) ? iso : dateDisplay.format(new Date(t));
}

function pickCategory(
  c: { primary?: string | null } | string | null,
): string | null {
  return typeof c === "string" ? c : (c?.primary ?? null);
}

function streamTitle(s: RecurringStream): string {
  return s.merchantName?.trim() || s.description?.trim() || "—";
}

function truncateName(name: string, max = 30): string {
  return name.length <= max ? name : `${name.slice(0, max)}…`;
}

function frequencyLabel(f: string | null): string {
  if (!f) {
    return "Unknown";
  }
  return f
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function streamTypeColor(t: string | null): Color {
  const v = t?.toLowerCase() ?? "";
  if (v.includes("income")) {
    return Color.Green;
  }
  if (v.includes("inflow")) {
    return Color.Green;
  }
  return Color.Orange;
}

function monthlyEquivalent(amount: number, frequency: string | null): number {
  const f = frequency?.toLowerCase() ?? "";
  if (f.includes("week")) {
    return amount * (52 / 12);
  }
  if (f.includes("biweek") || f.includes("bi_week") || f.includes("bi-week")) {
    return amount * (26 / 12);
  }
  if (f.includes("semi") && f.includes("month")) {
    return amount * 2;
  }
  if (f.includes("month")) {
    return amount;
  }
  if (f.includes("quarter")) {
    return amount / 3;
  }
  if (f.includes("annual") || f.includes("year")) {
    return amount / 12;
  }
  return amount;
}

function StreamDetail({
  brandfetchClientId,
  logoDevToken,
  stream,
}: {
  brandfetchClientId: string | undefined;
  logoDevToken: string | undefined;
  stream: RecurringStream;
}) {
  const isInflow = stream.averageAmount < 0;
  const avg = currency.format(Math.abs(stream.averageAmount));
  const last = currency.format(Math.abs(stream.lastAmount));
  const signedAvg = `${isInflow ? "+" : "-"}${avg}`;
  const monthly = currency.format(
    Math.abs(monthlyEquivalent(stream.averageAmount, stream.frequency)),
  );
  const primaryCategory = pickCategory(stream.category);
  const title = streamTitle(stream);
  const merchantIcon = pickRecurringIcon({
    brandfetchClientId,
    description: stream.description,
    logoDevToken,
    merchantName: stream.merchantName,
  });
  const institutionIcon = pickInstitutionIcon({
    accountName: stream.accountName,
    brandfetchClientId,
    institutionLogo: stream.institutionLogo,
    institutionName: stream.institutionName,
    institutionUrl: stream.institutionUrl,
  });

  const logoMd =
    typeof merchantIcon === "string" && /^https?:\/\//.test(merchantIcon)
      ? `![logo](${merchantIcon})\n\n`
      : "";

  const markdown = [
    logoMd,
    `# ${title}\n`,
    `## ${signedAvg} · ${frequencyLabel(stream.frequency)}\n`,
    stream.predictedNextDate
      ? `\n**Next charge:** ${formatDate(stream.predictedNextDate)}\n`
      : "",
  ].join("");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={stream.isActive ? "Active" : "Inactive"}
              color={stream.isActive ? Color.Green : Color.SecondaryText}
            />
            {stream.streamType ? (
              <Detail.Metadata.TagList.Item
                text={stream.streamType}
                color={streamTypeColor(stream.streamType)}
              />
            ) : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Frequency"
            text={frequencyLabel(stream.frequency)}
          />
          <Detail.Metadata.Label title="Average" text={signedAvg} />
          <Detail.Metadata.Label title="Last charge" text={last} />
          <Detail.Metadata.Label title="Monthly equivalent" text={monthly} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Predicted next"
            text={formatDate(stream.predictedNextDate)}
          />
          <Detail.Metadata.Label
            title="Last seen"
            text={formatDate(stream.lastDate)}
          />
          <Detail.Metadata.Label
            title="First seen"
            text={formatDate(stream.firstDate)}
          />
          <Detail.Metadata.Separator />
          {primaryCategory ? (
            <Detail.Metadata.Label
              title="Category"
              icon={categoryIcon(primaryCategory)}
              text={primaryCategory}
            />
          ) : null}
          {stream.categoryDetail ? (
            <Detail.Metadata.Label
              title="Subcategory"
              text={stream.categoryDetail}
            />
          ) : null}
          {stream.merchantName ? (
            <Detail.Metadata.Label
              title="Merchant"
              text={stream.merchantName}
            />
          ) : null}
          <Detail.Metadata.Separator />
          {stream.accountName ? (
            <Detail.Metadata.Label title="Account" text={stream.accountName} />
          ) : null}
          {stream.institutionName ? (
            <Detail.Metadata.Label
              title="Institution"
              icon={
                institutionIcon
                  ? { mask: Image.Mask.Circle, source: institutionIcon }
                  : undefined
              }
              text={stream.institutionName}
            />
          ) : null}
          <Detail.Metadata.Label
            title="Transactions"
            text={String(stream.transactionIds?.length ?? 0)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Average" content={avg} />
          <Action.CopyToClipboard
            title="Copy Merchant"
            content={stream.merchantName ?? title}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { apiUrl, brandfetchClientId, logoDevToken } =
    getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

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
    `${base}/v1/transactions/recurring`,
    {
      execute: !!accessToken,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      initialData: [] as RecurringStream[],
      keepPreviousData: true,
      mapResult(result: RecurringResponse) {
        return { data: result.streams };
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

  const streams = (data ?? []).filter((s) => {
    if (filter === "active") {
      return s.isActive === true;
    }
    if (filter === "inactive") {
      return s.isActive === false;
    }
    if (filter === "outflow") {
      return s.averageAmount >= 0;
    }
    if (filter === "inflow") {
      return s.averageAmount < 0;
    }
    return true;
  });

  const sorted = [...streams].toSorted((a, b) => {
    const aMonthly = Math.abs(monthlyEquivalent(a.averageAmount, a.frequency));
    const bMonthly = Math.abs(monthlyEquivalent(b.averageAmount, b.frequency));
    return bMonthly - aMonthly;
  });

  const totalMonthly = sorted.reduce(
    (sum, s) => sum + monthlyEquivalent(s.averageAmount, s.frequency),
    0,
  );

  return (
    <List
      isLoading={isLoading || !accessToken}
      searchBarPlaceholder={`Search · ~${currency.format(Math.abs(totalMonthly))}/mo`}
      actions={<ActionPanel>{signOutAction}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Inactive" value="inactive" />
          <List.Dropdown.Item title="Outflows" value="outflow" />
          <List.Dropdown.Item title="Inflows" value="inflow" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load recurring streams"
          description={error.message}
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
      {sorted.map((s) => {
        const avg = currency.format(Math.abs(s.averageAmount));
        const primaryCategory = pickCategory(s.category);
        const fullTitle = streamTitle(s);
        const title = truncateName(fullTitle);

        const accessories: List.Item.Accessory[] = [];

        const lastIsInflow = s.lastAmount < 0;
        const lastSigned = `${lastIsInflow ? "+" : "-"}${currency.format(Math.abs(s.lastAmount))}`;
        accessories.push({
          text: {
            color: lastIsInflow ? Color.Green : Color.Red,
            value: lastSigned,
          },
          tooltip: "Last charge",
        });

        accessories.push({
          tag: {
            color: s.isActive ? Color.Green : Color.SecondaryText,
            value: frequencyLabel(s.frequency),
          },
        });

        accessories.push({
          icon: categoryIcon(primaryCategory),
          tooltip: primaryCategory ?? undefined,
        });

        const institutionIcon = pickInstitutionIcon({
          accountName: s.accountName,
          brandfetchClientId,
          institutionLogo: s.institutionLogo,
          institutionName: s.institutionName,
          institutionUrl: s.institutionUrl,
        });
        accessories.push(
          institutionIcon
            ? {
                icon: { mask: Image.Mask.Circle, source: institutionIcon },
                tooltip: s.institutionName ?? undefined,
              }
            : { icon: "transparent.svg" },
        );

        accessories.push({
          text: s.predictedNextDate
            ? `Next ${formatDate(s.predictedNextDate)}`
            : formatDate(s.lastDate),
        });

        const merchantIcon = pickRecurringIcon({
          brandfetchClientId,
          description: s.description,
          logoDevToken,
          merchantName: s.merchantName,
        });

        return (
          <List.Item
            key={s.id}
            icon={{ mask: Image.Mask.Circle, source: merchantIcon }}
            title={title}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={
                    <StreamDetail
                      brandfetchClientId={brandfetchClientId}
                      logoDevToken={logoDevToken}
                      stream={s}
                    />
                  }
                />
                <Action.CopyToClipboard title="Copy Average" content={avg} />
                <Action.CopyToClipboard
                  title="Copy Merchant"
                  content={s.merchantName ?? fullTitle}
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
        );
      })}
      {!isLoading && !error && accessToken && sorted.length === 0 ? (
        <List.EmptyView
          icon={Icon.Repeat}
          title="No recurring streams"
          description="Plaid hasn't detected any recurring transactions yet"
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}
