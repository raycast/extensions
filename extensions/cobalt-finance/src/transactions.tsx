import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

import type { components } from "./api-types";
import { currency, formatDate, truncateName } from "./format";
import { categoryIcon, pickMerchantIcon } from "./icons";
import { useCobaltSession } from "./use-cobalt-session";

type Transaction = components["schemas"]["Transaction"];
type TransactionList = components["schemas"]["TransactionList"];

const PAGE_SIZE = 50;

function displayName(tx: Transaction): string {
  return tx.merchant?.trim() || tx.name?.trim() || "";
}

function formatLocation(loc: Transaction["location"]): string | null {
  if (!loc) {
    return null;
  }
  const parts = [loc.city, loc.region, loc.country].filter((v): v is string => !!v);
  return parts.length > 0 ? parts.join(", ") : null;
}

function TransactionMetadata({
  category,
  signedAmount,
  tx,
}: {
  category: string | null;
  signedAmount: string;
  tx: Transaction;
}) {
  const location = formatLocation(tx.location);
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
      <Detail.Metadata.Separator />
      {category ? <Detail.Metadata.Label title="Category" icon={categoryIcon(category)} text={category} /> : null}
      {tx.merchant ? <Detail.Metadata.Label title="Merchant" text={tx.merchant} /> : null}
      {location ? <Detail.Metadata.Label title="Location" text={location} /> : null}
    </Detail.Metadata>
  );
}

function TransactionDetail({ tx }: { tx: Transaction }) {
  const isCredit = tx.amount > 0;
  const amountStr = currency.format(Math.abs(tx.amount));
  const signedAmount = `${isCredit ? "+" : "-"}${amountStr}`;
  const merchantIcon = pickMerchantIcon({
    counterparties: null,
    logoUrl: null,
    website: null,
  });
  const title = displayName(tx) || "—";

  const logoMd =
    typeof merchantIcon === "string" && /^https?:\/\//.test(merchantIcon) ? `![logo](${merchantIcon})\n\n` : "";

  const markdown = [logoMd, `# ${title}\n`, `## ${signedAmount}\n`, tx.notes ? `\n---\n\n${tx.notes}\n` : ""].join("");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={title}
      metadata={<TransactionMetadata category={tx.category} signedAmount={signedAmount} tx={tx} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
          <Action.CopyToClipboard title="Copy Merchant" content={tx.merchant ?? title} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { accessToken, base, signOutAction } = useCobaltSession();
  const [searchText, setSearchText] = useState("");

  const buildUrl = useMemo(
    () => (options: { page: number; cursor?: string }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (options.cursor) {
        params.set("cursor", options.cursor);
      }
      return `${base}/v1/transactions?${params.toString()}`;
    },
    [base],
  );

  const { isLoading, data, revalidate, error, pagination } = useFetch<TransactionList, Transaction[], Transaction[]>(
    buildUrl,
    {
      execute: !!accessToken,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      initialData: [],
      keepPreviousData: true,
      mapResult(result: TransactionList) {
        return {
          cursor: result.nextCursor ?? undefined,
          data: result.items,
          hasMore: result.hasMore,
        };
      },
    },
  );

  const q = searchText.trim().toLowerCase();
  const filtered = q
    ? data.filter((tx) => {
        const fields = [tx.name, tx.merchant ?? "", tx.category ?? "", String(tx.amount)];
        return fields.some((f) => f.toLowerCase().includes(q));
      })
    : data;

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
      {filtered.map((tx) => {
        const title = truncateName(displayName(tx) || "—", 40);
        const isCredit = tx.amount > 0;
        const amountStr = currency.format(Math.abs(tx.amount));
        const category = tx.category;

        const accessories: List.Item.Accessory[] = [
          {
            text: {
              color: isCredit ? Color.Green : Color.Red,
              value: `${isCredit ? "+" : "-"}${amountStr}`,
            },
          },
          {
            icon: tx.pending ? "categories/pending.svg" : "categories/posted.svg",
            tooltip: tx.pending ? "Pending" : "Posted",
          },
          {
            icon: categoryIcon(category),
            tooltip: category ?? undefined,
          },
          { text: formatDate(tx.date) },
        ];

        const merchantIcon = pickMerchantIcon({
          counterparties: null,
          logoUrl: null,
          website: null,
        });

        return (
          <List.Item
            key={tx.id}
            icon={{ mask: Image.Mask.Circle, source: merchantIcon }}
            title={title}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" icon={Icon.Sidebar} target={<TransactionDetail tx={tx} />} />
                <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
                <Action.CopyToClipboard title="Copy Merchant" content={tx.merchant ?? title} />
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
      {!isLoading && !error && accessToken && filtered.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No transactions"
          description={searchText ? "Try a different search" : "Nothing here yet"}
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}
