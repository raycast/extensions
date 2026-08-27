import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { useBots } from "./hooks/use-bots";
import { botListIcon } from "./lib/bot-icon";
import { filterBotsForList } from "./lib/match-bot";
import { Bot, statusLabel } from "./lib/types";
import { AskForm } from "./views/ask-form";
import { ChromeActionPanel, GatewayEmptyView, HiddenBotsEmptyView, SearchEmptyView } from "./views/gateway-empty";
import { OpenGrokBotAction } from "./views/open-grok-bot-action";

const COPY_ID_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "c" };

function BotListItem({
  bot,
  bots,
  onRefresh,
  onResetRanking,
  onVisit,
}: {
  bot: Bot;
  bots: Bot[];
  onRefresh: () => void;
  onResetRanking: (bot: Bot) => void;
  onVisit: (bot: Bot) => void;
}) {
  const accessory = statusLabel(bot.status);
  const subtitle = bot.title || bot.description || bot.lastPreview || undefined;

  return (
    <List.Item
      id={bot.id}
      title={bot.name}
      subtitle={subtitle}
      icon={botListIcon(bot)}
      accessories={accessory ? [{ text: accessory }] : []}
      actions={
        <ActionPanel>
          <Action.Push
            title="Ask Bot"
            icon={Icon.Message}
            target={<AskForm bots={bots} initialBotId={bot.id} />}
            onPush={() => onVisit(bot)}
          />
          <OpenGrokBotAction />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy ID"
              icon={Icon.Clipboard}
              content={bot.id}
              shortcut={COPY_ID_SHORTCUT}
            />
            <Action.CopyToClipboard title="Copy Name" icon={Icon.Text} content={bot.name} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => onResetRanking(bot)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function BotsCommand() {
  const { bots, error, isLoading, revalidate } = useBots();
  const [searchText, setSearchText] = useState("");
  const {
    data: rankedBots,
    resetRanking,
    visitItem,
  } = useFrecencySorting(bots, {
    key: (bot) => bot.id,
  });
  const query = searchText.trim();
  const { groups, individuals, hidden } = useMemo(() => filterBotsForList(rankedBots, query), [query, rankedBots]);
  const listedCount = individuals.length + groups.length + hidden.length;
  const showGatewayEmpty = !isLoading && listedCount === 0 && (error !== null || bots.length === 0);
  const showSearchEmpty = !isLoading && listedCount === 0 && query.length > 0 && bots.length > 0;
  const showHiddenEmpty = !isLoading && listedCount === 0 && query.length === 0 && bots.length > 0;
  const listActions = <ChromeActionPanel onRefresh={revalidate} />;
  const renderBot = (bot: Bot) => (
    <BotListItem
      key={bot.id}
      bot={bot}
      bots={rankedBots}
      onRefresh={revalidate}
      onResetRanking={resetRanking}
      onVisit={visitItem}
    />
  );

  if (isLoading && bots.length === 0 && error === null) {
    return (
      <List isLoading searchBarPlaceholder="Search bots" actions={listActions}>
        <List.EmptyView
          title="Loading teammates"
          description="Names appear as they download. The first load can take a minute."
        />
      </List>
    );
  }

  if (showGatewayEmpty) {
    return (
      <List searchBarPlaceholder="Search bots">
        <GatewayEmptyView error={error} onRetry={revalidate} />
      </List>
    );
  }

  if (showSearchEmpty) {
    return (
      <List searchBarPlaceholder="Search bots" onSearchTextChange={setSearchText}>
        <SearchEmptyView onRefresh={revalidate} />
      </List>
    );
  }

  if (showHiddenEmpty) {
    return (
      <List searchBarPlaceholder="Search bots" onSearchTextChange={setSearchText}>
        <HiddenBotsEmptyView onRefresh={revalidate} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bots" onSearchTextChange={setSearchText}>
      {individuals.length > 0 ? <List.Section title="Bots">{individuals.map(renderBot)}</List.Section> : null}

      {groups.length > 0 ? <List.Section title="Groups">{groups.map(renderBot)}</List.Section> : null}

      {hidden.length > 0 ? <List.Section title="Hidden">{hidden.map(renderBot)}</List.Section> : null}
    </List>
  );
}
