import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { deleteFavorite, quicklinkFor, readFavorites, saveFavorite } from "./favoriteStore";
import { Favorite, fold, matchFavorites, riotIdOf, targetOf } from "./favorites";
import { RecentPlayer, clearHistory, forgetPlayer, readHistory } from "./history";
import { useAssets } from "./hooks";
import { PlayerView } from "./player-view";
import { parseRiotId } from "./riotid";

/** Favorites first, then a lookup for a typed Riot ID, then recent players. */
export function SearchList({ initialText }: { initialText: string }) {
  const assets = useAssets();
  const [text, setText] = useState(initialText);
  const [history, setHistory] = useState<RecentPlayer[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    void Promise.all([readHistory(), readFavorites()]).then(([recentPlayers, saved]) => {
      setHistory(recentPlayers);
      setFavorites(saved);
      setLoaded(true);
    });
  }, []);
  useEffect(refresh, [refresh]);

  const parsed = parseRiotId(text);
  const query = fold(text.trim());
  const savedIds = new Set(favorites.map((favorite) => favorite.puuid));
  const shownFavorites = matchFavorites(favorites, text);
  // A saved player is listed once, under Favorites.
  const recent = history.filter(
    (player) => !savedIds.has(player.puuid) && (!query || fold(`${player.gameName}#${player.tagLine}`).includes(query)),
  );
  const lookupIsFavorite =
    parsed !== undefined &&
    favorites.some(
      (favorite) =>
        fold(favorite.gameName) === fold(parsed.gameName) && fold(favorite.tagLine) === fold(parsed.tagLine),
    );

  const favoriteIcon = (favorite: Favorite) =>
    favorite.profileIconId !== undefined ? assets.profileIcon(favorite.profileIconId) : Icon.Person;

  return (
    <List
      isLoading={!loaded}
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Riot ID, or the name of a favorite"
    >
      {shownFavorites.length > 0 && (
        <List.Section title="Favorites">
          {shownFavorites.map((favorite) => (
            <List.Item
              key={favorite.puuid}
              icon={favoriteIcon(favorite)}
              title={favorite.gameName}
              subtitle={favorite.tagLine ? `#${favorite.tagLine}` : undefined}
              accessories={[
                ...(favorite.level ? [{ text: `Level ${favorite.level}` }] : []),
                ...(favorite.platform ? [{ tag: favorite.platform.toUpperCase() }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Player"
                    icon={Icon.Person}
                    target={<PlayerView target={targetOf(favorite)} />}
                    onPop={refresh}
                  />
                  <ActionPanel.Section>
                    <Action.CreateQuicklink
                      title="Create Quicklink"
                      icon={Icon.Link}
                      quicklink={quicklinkFor(favorite)}
                    />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.StarDisabled}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={async () => {
                        await deleteFavorite(favorite.puuid);
                        refresh();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Removed from Favorites",
                          message: riotIdOf(favorite),
                        });
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {parsed && !lookupIsFavorite && (
        <List.Section title="Look Up">
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={`${parsed.gameName}#${parsed.tagLine}`}
            subtitle="Look up this player"
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Player"
                  icon={Icon.Person}
                  target={<PlayerView target={parsed} />}
                  onPop={refresh}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {recent.length > 0 && (
        <List.Section title="Recent Players">
          {recent.map((player) => (
            <List.Item
              key={player.puuid}
              icon={assets.profileIcon(player.profileIconId)}
              title={player.gameName}
              subtitle={`#${player.tagLine}`}
              accessories={[{ text: `Level ${player.level}` }, { tag: player.platform.toUpperCase() }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Player"
                    icon={Icon.Person}
                    target={
                      <PlayerView
                        target={{
                          puuid: player.puuid,
                          gameName: player.gameName,
                          tagLine: player.tagLine,
                          platform: player.platform,
                        }}
                      />
                    }
                    onPop={refresh}
                  />
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={async () => {
                      await saveFavorite({
                        puuid: player.puuid,
                        gameName: player.gameName,
                        tagLine: player.tagLine,
                        platform: player.platform,
                        profileIconId: player.profileIconId,
                        level: player.level,
                      });
                      refresh();
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Added to Favorites",
                        message: `${player.gameName}#${player.tagLine}`,
                      });
                    }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Remove from History"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await forgetPlayer(player.puuid);
                        refresh();
                      }}
                    />
                    <Action
                      title="Clear History"
                      icon={{ source: Icon.Trash, tintColor: Color.Red }}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: "Clear recent players?",
                          message: "This clears the recent list. Favorites are kept.",
                          primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                        });
                        if (!confirmed) return;
                        await clearHistory();
                        refresh();
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {loaded && (
        <List.EmptyView
          icon={Icon.PersonLines}
          title={query ? "Add the tag line" : "Search for a player"}
          description={
            query
              ? `Riot IDs look like ${text.trim()}#TAG. Type # followed by the tag.`
              : "Type a Riot ID like Hide on bush#KR1. Press ⌘⇧F on a player to keep them as a favorite and find them by name alone."
          }
        />
      )}
    </List>
  );
}
