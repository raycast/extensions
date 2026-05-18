import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  formatCurrencyMoney,
  formatDateTime,
  formatShortDate,
  formatTokens,
  periodLabels,
  type PeriodKey,
} from "./lib/format";
import type { ConversationUsageSummary } from "./lib/types";

type UsageDetailsProps = {
  period: PeriodKey;
  providerTitle: string;
  currency: string;
  conversations: ConversationUsageSummary[];
  unavailableReason?: string;
};

type SortKey = "date" | "tokens" | "cost";

const COST_COLOR = Color.Green;
const DATE_COLOR = Color.Orange;

function sortConversations(
  conversations: ConversationUsageSummary[],
  sort: SortKey,
): ConversationUsageSummary[] {
  const copy = [...conversations];
  switch (sort) {
    case "tokens":
      return copy.sort(
        (a, b) =>
          b.totalTokens - a.totalTokens ||
          b.lastActive.getTime() - a.lastActive.getTime(),
      );
    case "cost":
      return copy.sort(
        (a, b) =>
          b.estimatedCost - a.estimatedCost ||
          b.totalTokens - a.totalTokens ||
          b.lastActive.getTime() - a.lastActive.getTime(),
      );
    case "date":
    default:
      return copy.sort(
        (a, b) => b.lastActive.getTime() - a.lastActive.getTime(),
      );
  }
}

export function UsageDetailsView({
  period,
  providerTitle,
  currency,
  conversations,
  unavailableReason,
}: UsageDetailsProps) {
  const [sort, setSort] = useState<SortKey>("date");
  const periodLabel = periodLabels[period];

  const sorted = useMemo(
    () => sortConversations(conversations, sort),
    [conversations, sort],
  );

  if (unavailableReason || sorted.length === 0) {
    return (
      <List navigationTitle={`${providerTitle} · ${periodLabel}`}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Details unavailable"
          description={
            unavailableReason ??
            "No per-chat breakdown is available for this provider and period."
          }
        />
      </List>
    );
  }

  const totalTokens = sorted.reduce((sum, c) => sum + c.totalTokens, 0);

  return (
    <List
      navigationTitle={`${providerTitle} · ${periodLabel}`}
      searchBarPlaceholder="Filter chats…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort chats"
          value={sort}
          onChange={(value) => setSort(value as SortKey)}
        >
          <List.Dropdown.Item title="Date (Newest)" value="date" />
          <List.Dropdown.Item title="Tokens (Highest)" value="tokens" />
          <List.Dropdown.Item title="Cost (Highest)" value="cost" />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Chats"
        subtitle={`${sorted.length} · ${formatTokens(totalTokens)} tokens`}
      >
        {sorted.map((chat) => (
          <ConversationListItem
            key={chat.key}
            chat={chat}
            currency={currency}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ConversationListItem({
  chat,
  currency,
}: {
  chat: ConversationUsageSummary;
  currency: string;
}) {
  const tokensStr = formatTokens(chat.totalTokens);
  const costStr =
    chat.estimatedCost > 0
      ? formatCurrencyMoney(chat.estimatedCost, currency)
      : undefined;
  const dateStr = formatShortDate(chat.lastActive);

  return (
    <List.Item
      title={chat.title}
      accessories={[
        { text: tokensStr, tooltip: `${tokensStr} tokens` },
        ...(costStr
          ? [
              {
                text: { value: costStr, color: COST_COLOR },
                tooltip: `Estimated cost · ${costStr}`,
              },
            ]
          : []),
        {
          text: { value: dateStr, color: DATE_COLOR },
          tooltip: `Last active · ${formatDateTime(chat.lastActive)}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Token Count"
            content={String(chat.totalTokens)}
          />
          {costStr ? (
            <Action.CopyToClipboard title="Copy Cost" content={costStr} />
          ) : null}
          <Action.CopyToClipboard title="Copy Title" content={chat.title} />
        </ActionPanel>
      }
    />
  );
}
