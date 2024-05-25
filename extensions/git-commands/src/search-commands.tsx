import { Action, ActionPanel, List, Icon, Color, Cache } from "@raycast/api";
import { useState, useEffect } from "react";
import { getData, typeColor, typeDescription, preferences } from "./utils";
import CommandDetail from "./command-detail";
import { Alias } from "./types";

const cache = new Cache();

export default function Command() {
  const [recents, setRecents] = useState<Alias[]>([]);
  const [favorites, setFavorites] = useState<Alias[]>([]);
  const aliases = getData();

  useEffect(() => {
    const cachedRecents = cache.get("recents");
    const cachedFavorites = cache.get("favorites");

    setRecents(cachedRecents ? JSON.parse(cachedRecents) : []);
    setFavorites(cachedFavorites ? JSON.parse(cachedFavorites) : []);
  }, []);

  const handleFavorite = (alias: Alias, isFavorited: boolean) => {
    const updatedFavorites = isFavorited
      ? favorites.filter((favorite) => favorite.name !== alias.name)
      : [alias, ...favorites].slice(0, preferences.MaxFavoriteAliases);
    setFavorites(updatedFavorites);
    cache.set("favorites", JSON.stringify(updatedFavorites));
  };

  const handleRecent = (alias: Alias, isRecent: boolean, isFavorite: boolean) => {
    if (isFavorite) return;

    const updatedRecents = isRecent
      ? recents.filter((recent) => recent.name !== alias.name)
      : [alias, ...recents].slice(0, preferences.MaxRecentAliases);
    setRecents(updatedRecents);
    cache.set("recents", JSON.stringify(updatedRecents));
  };

  function commonActions(alias: Alias) {
    const isFavorite = favorites.some((favorite) => favorite.name === alias.name);
    const isRecent = recents.some((recent) => recent.name === alias.name);
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Push
            icon={Icon.Eye}
            title="Open Alias"
            target={<CommandDetail alias={alias} />}
            onPush={() => handleRecent(alias, isRecent, isFavorite)}
          />

          <Action.CopyToClipboard
            title="Copy Alias"
            content={alias.name}
            onCopy={() => handleRecent(alias, isRecent, isFavorite)}
          />

          {isFavorite ? (
            <Action
              icon={Icon.StarDisabled}
              title="Remove Favorites"
              onAction={() => handleFavorite(alias, true)}
              shortcut={{ modifiers: ["cmd"], key: "x" }}
            />
          ) : (
            <Action
              icon={Icon.Star}
              title="Save Favorite"
              onAction={() => handleFavorite(alias, false)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {isRecent && (
            <Action
              icon={Icon.XMarkCircle}
              title="Remove Recents"
              onAction={() => handleRecent(alias, isRecent, isFavorite)}
              shortcut={{ modifiers: ["cmd"], key: "x" }}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  const aliasAccesory = (alias: Alias) => {
    return [{ tag: { value: "•", color: typeColor(alias.type) }, tooltip: typeDescription(alias.type) }];
  };

  return (
    <List searchBarPlaceholder="Search for commands or aliases ...">
      {favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((alias) => (
            <List.Item
              key={alias.name}
              icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
              title={{ value: alias.name, tooltip: alias.command }}
              subtitle={alias[preferences.SubtlitleOption as keyof Alias]}
              accessories={aliasAccesory(alias)}
              actions={commonActions(alias)}
            />
          ))}
        </List.Section>
      )}

      {recents.length > 0 && (
        <List.Section title="Recently Used">
          {recents.map((alias) => (
            <List.Item
              key={alias.name}
              title={{ value: alias.name, tooltip: alias.command }}
              subtitle={alias[preferences.SubtlitleOption as keyof Alias]}
              accessories={aliasAccesory(alias)}
              actions={commonActions(alias)}
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Commands">
        {aliases.map((alias) => {
          const isFavorite = favorites.some((favorite) => favorite.name === alias.name);
          return (
            <List.Item
              key={alias.name}
              {...(isFavorite ? { icon: { source: Icon.Dot, tintColor: Color.SecondaryText } } : {})}
              title={{ value: alias.name, tooltip: alias.command }}
              subtitle={alias[preferences.SubtlitleOption as keyof Alias]}
              keywords={[alias.description]}
              accessories={aliasAccesory(alias)}
              actions={commonActions(alias)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
