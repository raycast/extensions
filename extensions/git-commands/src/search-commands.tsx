import { Action, ActionPanel, List, Icon, Color, Cache } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getData, typeColor, preferences } from "./utils";
import CommandDetail from "./command-detail";
import { Alias } from "./types";

const cache = new Cache();

export default function Command() {
  const aliases = getData();

  const {
    isLoading: isLoadingFavorites,
    data: favorites,
    revalidate: refreshFavs,
  } = useCachedPromise(async () => {
    const response = cache.get("favorites");
    return response ? (JSON.parse(response) as Alias[]) : [];
  });

  const {
    isLoading: isLoadingRecents,
    data: recents,
    revalidate: refreshRecents,
  } = useCachedPromise(async () => {
    const response = cache.get("recents");
    return response ? (JSON.parse(response) as Alias[]) : [];
  });

  const handleFavorite = (alias: Alias, isFavorited: boolean) => {
    if (!favorites) return;

    const updated = isFavorited
      ? favorites.filter((favorite) => favorite.name !== alias.name)
      : [alias, ...favorites].slice(0, preferences.MaxFavorites);
    cache.set("favorites", JSON.stringify(updated));

    refreshFavs();
  };

  const handleRecent = (alias: Alias, isRecent: boolean, isFavorite: boolean) => {
    if (!recents || isFavorite || isRecent) return;

    const updated = [alias, ...recents].slice(0, preferences.MaxRecents);
    cache.set("recents", JSON.stringify(updated));

    refreshRecents();
  };

  const removeAllRecents = () => {
    cache.set("recents", JSON.stringify([]));
    refreshRecents();
  };

  const removeAllFavorites = () => {
    cache.set("favorites", JSON.stringify([]));
    refreshFavs();
  };

  const AliasItem = (alias: Alias) => {
    const isFavorite = !!favorites && favorites.some((favorite) => favorite.name === alias.name);
    const isRecent = !!recents && recents.some((recent) => recent.name === alias.name);

    return {
      key: alias.name,
      title: alias.command,
      subtitle: alias.description,
      keywords: [alias.description, alias.command],
      accessories: [{ tag: { value: alias.name, color: typeColor(alias.type) } }],
      actions: (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Eye}
              title="Open Alias"
              target={
                <CommandDetail
                  alias={alias}
                  isFavorite={isFavorite}
                  onFavorite={() => handleFavorite(alias, isFavorite)}
                  onCopy={() => handleRecent(alias, isRecent, isFavorite)}
                />
              }
            />

            <Action.CopyToClipboard
              title="Copy Alias"
              content={alias.name}
              onCopy={() => handleRecent(alias, isRecent, isFavorite)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              title={isFavorite ? "Remove Favorite" : "Save Favorite"}
              onAction={() => handleFavorite(alias, isFavorite)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
          {isRecent && (
            <Action
              icon={Icon.Clock}
              title="Remove Recent"
              onAction={() => handleRecent(alias, isRecent, isFavorite)}
              shortcut={{ modifiers: ["cmd"], key: "x" }}
            />
          )}
          <Action icon={Icon.Clock} title="Remove All Recents" onAction={() => removeAllRecents()} />
          <Action icon={Icon.StarDisabled} title="Remove All Favorites" onAction={() => removeAllFavorites()} />
        </ActionPanel>
      ),
      ...(isFavorite ? { icon: { source: Icon.Dot, tintColor: Color.SecondaryText } } : {}),
    };
  };

  return (
    <List isLoading={isLoadingFavorites || isLoadingRecents} searchBarPlaceholder="Search for commands ...">
      {favorites && favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((alias) => (
            <List.Item icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }} {...AliasItem(alias)} />
          ))}
        </List.Section>
      )}

      {recents && recents.length > 0 && (
        <List.Section title="Recently Used">
          {recents.map((alias) => (
            <List.Item {...AliasItem(alias)} />
          ))}
        </List.Section>
      )}

      <List.Section title="Commands">
        {(aliases || []).map((alias) => (
          <List.Item {...AliasItem(alias)} />
        ))}
      </List.Section>
    </List>
  );
}
