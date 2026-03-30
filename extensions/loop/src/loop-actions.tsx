import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  ACTIONS,
  CATEGORY_ORDER,
  FAVORITES_KEY,
  LoopAction,
  POPULAR_ACTION_IDS,
  readStoredIds,
  runLoopAction,
  runLoopKeybind,
  writeStoredIds,
} from "./loop-utils";

type ListItemProps = {
  action: LoopAction;
  isFavorite: boolean;
  isRecent: boolean;
  onRunAction: (action: LoopAction) => Promise<void>;
  onToggleFavorite: (actionId: string) => Promise<void>;
};

function LoopListItem({ action, isFavorite, isRecent, onRunAction, onToggleFavorite }: ListItemProps) {
  return (
    <List.Item
      id={action.id}
      title={action.title}
      subtitle={action.description}
      keywords={[action.category, ...action.aliases]}
      accessories={[
        ...(isFavorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : []),
        ...(isRecent ? [{ icon: Icon.Clock, tooltip: "Recent" }] : []),
        { tag: action.category },
      ]}
      actions={
        <ActionPanel>
          <Action title="Run Action" onAction={() => onRunAction(action)} />
          <Action
            title={isFavorite ? "Remove Favorite" : "Add Favorite"}
            icon={Icon.Star}
            onAction={() => onToggleFavorite(action.id)}
          />
          <Action.CopyToClipboard title="Copy Loop URL" content={action.url} />
          <Action.OpenInBrowser title="Open Loop Automation Docs" url="https://github.com/MrKai77/Loop#usage" />
        </ActionPanel>
      }
    />
  );
}

export default function LoopActions() {
  const [searchText, setSearchText] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [favorites, recents] = await Promise.all([
        readStoredIds(FAVORITES_KEY),
        readStoredIds("recent-action-ids"),
      ]);
      setFavoriteIds(favorites);
      setRecentIds(recents);
      setIsLoading(false);
    }

    load();
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const recentSet = useMemo(() => new Set(recentIds), [recentIds]);
  const actionMap = useMemo(() => new Map(ACTIONS.map((action) => [action.id, action])), []);

  async function toggleFavorite(actionId: string) {
    const nextFavoriteIds = favoriteSet.has(actionId)
      ? favoriteIds.filter((id) => id !== actionId)
      : [actionId, ...favoriteIds];

    setFavoriteIds(nextFavoriteIds);
    await writeStoredIds(FAVORITES_KEY, nextFavoriteIds);
  }

  async function handleRunAction(action: LoopAction) {
    await runLoopAction(action);

    const nextRecentIds = [action.id, ...recentIds.filter((id) => id !== action.id)].slice(0, 8);
    setRecentIds(nextRecentIds);
  }

  const favorites = favoriteIds
    .map((id) => actionMap.get(id))
    .filter((action): action is LoopAction => Boolean(action));
  const recents = recentIds
    .filter((id) => !favoriteSet.has(id))
    .map((id) => actionMap.get(id))
    .filter((action): action is LoopAction => Boolean(action));
  const popular = POPULAR_ACTION_IDS.filter((id) => !favoriteSet.has(id) && !recentSet.has(id))
    .map((id) => actionMap.get(id))
    .filter((action): action is LoopAction => Boolean(action));
  const popularSet = new Set(popular.map((action) => action.id));
  const groupedActions = CATEGORY_ORDER.map((category) => ({
    category,
    items: ACTIONS.filter(
      (action) =>
        action.category === category &&
        !favoriteSet.has(action.id) &&
        !recentSet.has(action.id) &&
        !popularSet.has(action.id),
    ),
  })).filter((group) => group.items.length > 0);

  const trimmedSearch = searchText.trim();
  const exactActionMatch = ACTIONS.some((action) => {
    const normalizedSearch = trimmedSearch.toLowerCase();
    return (
      action.title.toLowerCase() === normalizedSearch ||
      action.id === normalizedSearch ||
      action.aliases.some((alias) => alias.toLowerCase() === normalizedSearch)
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Loop actions or type a custom keybind name"
      filtering
      onSearchTextChange={setSearchText}
      navigationTitle="Loop Window Actions"
    >
      {trimmedSearch && !exactActionMatch ? (
        <List.Section title="Custom Keybind">
          <List.Item
            title={`Run "${trimmedSearch}"`}
            subtitle="Trigger a named Loop keybind"
            accessories={[{ tag: "Keybind" }]}
            actions={
              <ActionPanel>
                <Action title="Run Keybind" onAction={() => runLoopKeybind(trimmedSearch)} />
                <Action.CopyToClipboard
                  title="Copy Loop URL"
                  content={`loop://keybind/${encodeURIComponent(trimmedSearch)}`}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {favorites.length > 0 ? (
        <List.Section title="Favorites">
          {favorites.map((action) => (
            <LoopListItem
              key={action.id}
              action={action}
              isFavorite
              isRecent={recentSet.has(action.id)}
              onRunAction={handleRunAction}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </List.Section>
      ) : null}

      {recents.length > 0 ? (
        <List.Section title="Recent">
          {recents.map((action) => (
            <LoopListItem
              key={action.id}
              action={action}
              isFavorite={favoriteSet.has(action.id)}
              isRecent
              onRunAction={handleRunAction}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </List.Section>
      ) : null}

      {popular.length > 0 ? (
        <List.Section title="Popular">
          {popular.map((action) => (
            <LoopListItem
              key={action.id}
              action={action}
              isFavorite={favoriteSet.has(action.id)}
              isRecent={recentSet.has(action.id)}
              onRunAction={handleRunAction}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </List.Section>
      ) : null}

      {groupedActions.map((group) => (
        <List.Section key={group.category} title={group.category}>
          {group.items.map((action) => (
            <LoopListItem
              key={action.id}
              action={action}
              isFavorite={favoriteSet.has(action.id)}
              isRecent={recentSet.has(action.id)}
              onRunAction={handleRunAction}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
