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
import { useEffect, useMemo, useState } from "react";

import { categoryIcon, pickInstitutionIcon, pickMerchantIcon } from "./icons";
import { authorize, logout } from "./oauth";

interface Counterparty {
  type?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

interface TransactionItem {
  id: string;
  name: string;
  merchantName: string | null;
  amount: number;
  date: string;
  authorizedDate: string | null;
  pending: boolean;
  category: { primary?: string | null } | string | null;
  categoryDetail: string | null;
  logoUrl: string | null;
  accountName: string | null;
  accountType: string | null;
  institutionName: string | null;
  institutionLogo: string | null;
  institutionUrl: string | null;
  website: string | null;
  notes: string | null;
  counterparties?: Counterparty[] | null;
}

interface TransactionListResponse {
  transactions: TransactionItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 50;

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

/** Mirror `getTransactionDisplayName`: prefer raw `name`, fall back to merchant. */
function displayName(tx: TransactionItem): string {
  return tx.name?.trim() || tx.merchantName?.trim() || "";
}

/** Mirror `truncateName(_, 40)` from `transactions-table.tsx`. */
function truncateName(name: string, max = 40): string {
  return name.length <= max ? name : `${name.slice(0, max)}…`;
}

/** Mirror `formatTransactionDateDisplay`: parse the date as a UTC noon to avoid TZ skew. */
function formatDate(iso: string): string {
  const day = String(iso).split("T")[0] ?? String(iso);
  const t = new Date(`${day}T12:00:00.000Z`).getTime();
  return Number.isNaN(t) ? iso : dateDisplay.format(new Date(t));
}

function TransactionMetadata({
  institutionIcon,
  merchantUrl,
  primaryCategory,
  signedAmount,
  tx,
}: {
  institutionIcon: string | null;
  merchantUrl: string | null;
  primaryCategory: string | null;
  signedAmount: string;
  tx: TransactionItem;
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={tx.pending ? "Pending" : "Posted"}
          color={tx.pending ? Color.Orange : Color.Green}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Amount" text={signedAmount} />
      <Detail.Metadata.Label title="Date" text={formatDate(tx.date)} />
      {tx.authorizedDate && tx.authorizedDate !== tx.date ? (
        <Detail.Metadata.Label
          title="Authorized"
          text={formatDate(tx.authorizedDate)}
        />
      ) : null}
      <Detail.Metadata.Separator />
      {primaryCategory ? (
        <Detail.Metadata.Label
          title="Category"
          icon={categoryIcon(primaryCategory)}
          text={primaryCategory}
        />
      ) : null}
      {tx.categoryDetail ? (
        <Detail.Metadata.Label title="Subcategory" text={tx.categoryDetail} />
      ) : null}
      {tx.merchantName ? (
        <Detail.Metadata.Label title="Merchant" text={tx.merchantName} />
      ) : null}
      {merchantUrl ? (
        <Detail.Metadata.Link
          title="Website"
          target={merchantUrl}
          text={tx.website ?? merchantUrl}
        />
      ) : null}
      <Detail.Metadata.Separator />
      {tx.accountName ? (
        <Detail.Metadata.Label title="Account" text={tx.accountName} />
      ) : null}
      {tx.institutionName ? (
        <Detail.Metadata.Label
          title="Institution"
          icon={
            institutionIcon
              ? { mask: Image.Mask.Circle, source: institutionIcon }
              : undefined
          }
          text={tx.institutionName}
        />
      ) : null}
    </Detail.Metadata>
  );
}

function TransactionDetail({
  brandfetchClientId,
  tx,
}: {
  brandfetchClientId: string | undefined;
  tx: TransactionItem;
}) {
  const isCredit = tx.amount < 0;
  const amountStr = currency.format(Math.abs(tx.amount));
  const signedAmount = `${isCredit ? "+" : "-"}${amountStr}`;
  const primaryCategory =
    typeof tx.category === "string"
      ? tx.category
      : (tx.category?.primary ?? null);
  const merchantIcon = pickMerchantIcon({
    brandfetchClientId,
    counterparties: tx.counterparties,
    logoUrl: tx.logoUrl,
    website: tx.website,
  });
  const institutionIcon = pickInstitutionIcon({
    accountName: tx.accountName,
    brandfetchClientId,
    institutionLogo: tx.institutionLogo,
    institutionName: tx.institutionName,
    institutionUrl: tx.institutionUrl,
  });
  const title = displayName(tx) || tx.merchantName || "—";

  const logoMd =
    typeof merchantIcon === "string" && /^https?:\/\//.test(merchantIcon)
      ? `![logo](${merchantIcon})\n\n`
      : "";

  const markdown = [
    logoMd,
    `# ${title}\n`,
    `## ${signedAmount}\n`,
    tx.notes ? `\n---\n\n${tx.notes}\n` : "",
  ].join("");

  let merchantUrl: string | null = null;
  if (tx.website) {
    merchantUrl = tx.website.startsWith("http")
      ? tx.website
      : `https://${tx.website}`;
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={title}
      metadata={
        <TransactionMetadata
          institutionIcon={institutionIcon}
          merchantUrl={merchantUrl}
          primaryCategory={primaryCategory}
          signedAmount={signedAmount}
          tx={tx}
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
          <Action.CopyToClipboard
            title="Copy Merchant"
            content={tx.merchantName ?? title}
          />
          {merchantUrl ? (
            <Action.OpenInBrowser
              title="Open Merchant Website"
              url={merchantUrl}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { apiUrl, brandfetchClientId } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const [searchText, setSearchText] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  const buildUrl = useMemo(
    () => (options: { page: number; cursor?: string }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (options.cursor) {
        params.set("cursor", options.cursor);
      }
      if (searchText.trim()) {
        params.set("searchQuery", searchText.trim());
      }
      return `${base}/v1/transactions?${params.toString()}`;
    },
    [base, searchText],
  );

  const { isLoading, data, revalidate, error, pagination } = useFetch(
    buildUrl,
    {
      execute: !!accessToken,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      initialData: [] as TransactionItem[],
      keepPreviousData: true,
      mapResult(result: TransactionListResponse) {
        return {
          cursor: result.nextCursor ?? undefined,
          data: result.transactions,
          hasMore: result.hasMore,
        };
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

  return (
    <List
      isLoading={isLoading || !accessToken}
      pagination={pagination}
      searchBarPlaceholder="Search merchant, amount, category..."
      onSearchTextChange={setSearchText}
      throttle
      actions={<ActionPanel>{signOutAction}</ActionPanel>}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load transactions"
          description={error.message}
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
      {data.map((tx) => {
        const title = truncateName(displayName(tx) || tx.merchantName || "—");
        // Web: amount >= 0 is a debit (red), amount < 0 is a credit (green).
        const isCredit = tx.amount < 0;
        const amountStr = currency.format(Math.abs(tx.amount));
        const primaryCategory =
          typeof tx.category === "string"
            ? tx.category
            : (tx.category?.primary ?? null);

        const institutionIcon = pickInstitutionIcon({
          accountName: tx.accountName,
          brandfetchClientId,
          institutionLogo: tx.institutionLogo,
          institutionName: tx.institutionName,
          institutionUrl: tx.institutionUrl,
        });
        const institutionAccessory: List.Item.Accessory = institutionIcon
          ? {
              icon: { mask: Image.Mask.Circle, source: institutionIcon },
              tooltip: tx.institutionName ?? undefined,
            }
          : { icon: "transparent.svg" };

        const accessories: List.Item.Accessory[] = [
          {
            text: {
              color: isCredit ? Color.Green : Color.Red,
              value: `${isCredit ? "+" : "-"}${amountStr}`,
            },
          },
          {
            icon: tx.pending
              ? "categories/pending.svg"
              : "categories/posted.svg",
            tooltip: tx.pending ? "Pending" : "Posted",
          },
          {
            icon: categoryIcon(primaryCategory),
            tooltip: primaryCategory ?? undefined,
          },
          institutionAccessory,
          { text: formatDate(tx.date) },
        ];

        const merchantIcon = pickMerchantIcon({
          brandfetchClientId,
          counterparties: tx.counterparties,
          logoUrl: tx.logoUrl,
          website: tx.website,
        });

        return (
          <List.Item
            key={tx.id}
            icon={{ mask: Image.Mask.Circle, source: merchantIcon }}
            title={title}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={
                    <TransactionDetail
                      brandfetchClientId={brandfetchClientId}
                      tx={tx}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Amount"
                  content={amountStr}
                />
                <Action.CopyToClipboard
                  title="Copy Merchant"
                  content={tx.merchantName ?? title}
                />
                {tx.website ? (
                  <Action.OpenInBrowser
                    title="Open Merchant Website"
                    url={
                      tx.website.startsWith("http")
                        ? tx.website
                        : `https://${tx.website}`
                    }
                  />
                ) : null}
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
      {!isLoading && !error && accessToken && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No transactions"
          description={
            searchText ? "Try a different search" : "Nothing here yet"
          }
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}
