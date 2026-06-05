import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  formatCurrencyMoney,
  formatDateTime,
  formatShortDate,
  formatTokens,
  periodLabels,
  type PeriodKey,
} from "./lib/format";
import {
  openConversationTitle,
  openConversationTooltip,
  runOpenConversation,
} from "./lib/open-conversation";
import { COST_COLOR, DATE_COLOR } from "./lib/ui-colors";
import { loadConversationDetails } from "./lib/usage";
import type { ConversationUsageSummary, SourceProviderKey } from "./lib/types";

type UsageDetailsProps = {
  period: PeriodKey;
  provider: SourceProviderKey;
  providerTitle: string;
  currency: string;
};

type SortKey = "date" | "tokens" | "cost";

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
  provider,
  providerTitle,
  currency,
}: UsageDetailsProps) {
  const [sort, setSort] = useState<SortKey>("date");
  const periodLabel = periodLabels[period];

  const { isLoading, data: conversations } = useCachedPromise(
    (p: PeriodKey, prov: SourceProviderKey) => loadConversationDetails(p, prov),
    [period, provider],
    { keepPreviousData: true },
  );

  const sorted = useMemo(
    () => sortConversations(conversations ?? [], sort),
    [conversations, sort],
  );

  if (isLoading && sorted.length === 0) {
    return (
      <List isLoading navigationTitle={`${providerTitle} · ${periodLabel}`} />
    );
  }

  if (sorted.length === 0) {
    return (
      <List navigationTitle={`${providerTitle} · ${periodLabel}`}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Details unavailable"
          description="No per-chat breakdown is available for this period."
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
            provider={provider}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ConversationListItem({
  chat,
  currency,
  provider,
}: {
  chat: ConversationUsageSummary;
  currency: string;
  provider: SourceProviderKey;
}) {
  const tokensStr = formatTokens(chat.totalTokens);
  const costStr =
    chat.estimatedCost > 0
      ? formatCurrencyMoney(chat.estimatedCost, currency)
      : undefined;
  const dateStr = formatShortDate(chat.lastActive);
  const openTooltip = openConversationTooltip(provider);

  return (
    <List.Item
      title={{
        value: chat.title,
        tooltip: openTooltip,
      }}
      accessories={[
        ...(costStr
          ? [
              {
                text: { value: costStr, color: COST_COLOR },
                tooltip: `Estimated cost · ${costStr}`,
              },
            ]
          : []),
        { text: tokensStr, tooltip: `${tokensStr} tokens` },
        {
          text: { value: dateStr, color: DATE_COLOR },
          tooltip: `Last active · ${formatDateTime(chat.lastActive)}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={openConversationTitle(provider)}
            icon={Icon.ArrowNe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => runOpenConversation(provider, chat)}
          />
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
