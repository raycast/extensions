import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { useBots } from "./hooks/use-bots";
import { useFavoriteIds } from "./hooks/use-favorite-ids";
import { botListIcon } from "./lib/bot-icon";
import { extensionIcon } from "./lib/extension-icon";
import { filterBotsForList } from "./lib/match-bot";
import { AgentId, Bot, statusLabel } from "./lib/types";
import { AskForm } from "./views/ask-form";
import { ChromeActions } from "./views/chrome-actions";
import { GatewayEmptyView, HiddenBotsEmptyView, RosterLoadingView, SearchEmptyView } from "./views/gateway-empty";

const COPY_ID_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "c" };
const FAVORITE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "f" };

function BotListItem({
  bot,
  bots,
  isFavorite,
  onRefresh,
  onResetRanking,
  onToggleFavorite,
  onVisit,
}: {
  bot: Bot;
  bots: Bot[];
  isFavorite: boolean;
  onRefresh: () => void;
  onResetRanking: (bot: Bot) => void;
  onToggleFavorite: (id: AgentId) => void;
  onVisit: (bot: Bot) => void;
}) {
  const label = statusLabel(bot.status);
  const subtitle = bot.title || bot.description || bot.lastPreview || undefined;

  return (
    <List.Item
      id={bot.id}
      title={bot.name}
      subtitle={subtitle}
      icon={botListIcon(bot)}
      accessories={[...(isFavorite ? [{ icon: Icon.Star }] : []), ...(label ? [{ text: label }] : [])]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Ask Bot"
            icon={extensionIcon}
            target={<AskForm bots={bots} initialBotId={bot.id} />}
            onPush={() => onVisit(bot)}
          />
          <ChromeActions kind="refresh" onRefresh={onRefresh} />
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
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={FAVORITE_SHORTCUT}
              onAction={() => onToggleFavorite(bot.id)}
            />
            <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => onResetRanking(bot)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function BotsCommand() {
  const { bots, error, isLoading, revalidate } = useBots();
  const { favoriteIds, toggleFavorite } = useFavoriteIds();
  const [searchText, setSearchText] = useState("");
  const {
    data: rankedBots,
    resetRanking,
    visitItem,
  } = useFrecencySorting(bots, {
    key: (bot) => bot.id,
  });
  const query = searchText.trim();
  const { favorites, groups, individuals, hidden } = useMemo(
    () => filterBotsForList({ bots: rankedBots, query, favoriteIds }),
    [favoriteIds, query, rankedBots],
  );
  const listedCount = favorites.length + individuals.length + groups.length + hidden.length;
  const showGatewayEmpty = !isLoading && bots.length === 0;
  const showSearchEmpty = !isLoading && listedCount === 0 && query.length > 0 && bots.length > 0;
  const showHiddenEmpty = !isLoading && listedCount === 0 && query.length === 0 && bots.length > 0;
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const renderBot = (bot: Bot) => (
    <BotListItem
      key={bot.id}
      bot={bot}
      bots={rankedBots}
      isFavorite={favoriteSet.has(bot.id)}
      onRefresh={revalidate}
      onResetRanking={resetRanking}
      onToggleFavorite={toggleFavorite}
      onVisit={visitItem}
    />
  );

  if (isLoading && bots.length === 0 && error === null) {
    return (
      <List isLoading searchBarPlaceholder="Search bots">
        <RosterLoadingView onRetry={revalidate} />
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
      {favorites.length > 0 ? <List.Section title="Favorites">{favorites.map(renderBot)}</List.Section> : null}

      {individuals.length > 0 ? <List.Section title="Bots">{individuals.map(renderBot)}</List.Section> : null}

      {groups.length > 0 ? <List.Section title="Groups">{groups.map(renderBot)}</List.Section> : null}

      {hidden.length > 0 ? <List.Section title="Hidden">{hidden.map(renderBot)}</List.Section> : null}
    </List>
  );
}
