import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { addToFavorites, getFavorites, isFavorite, moveFavorite, removeFromFavorites } from "./modules/favorites";
import { Now } from "./modules/getNow";
import { performSearch } from "./modules/search";

import countryEmoji = require("country-emoji");
const flag = countryEmoji.flag;

export interface Location {
  city: string;
  country: string;
  iso2: string;
  timezone: string;
}

type FavoriteActions = "remove" | "add" | "up" | "down";

export default function Command() {
  const { hourFormat } = getPreferenceValues();
  const [favorites, setFavorites] = useState<Now[]>([]);
  const [results, isLoading, search] = useSearch(setFavorites);

  useEffect(() => {
    getFavorites().then((storedFavorites) => {
      setFavorites(storedFavorites);
    });
  }, []);

  const updateFavorites = async (item: Now, action: FavoriteActions) => {
    let newFav: Now[] = [];
    if (action === "remove") {
      newFav = await removeFromFavorites(item);
    }
    if (action === "add") {
      newFav = await addToFavorites(item);
    }
    if (action === "up" || action === "down") {
      newFav = await moveFavorite(item, action);
    }
    // set favorites
    return setFavorites(newFav);
  };

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Now in ..." throttle>
      {!isLoading && results.length === 0 ? (
        <>
          {favorites.length > 0 ? (
            <List.Section title="Favorites">
              {favorites.map((item) => (
                <ListItem
                  key={item.city}
                  item={item}
                  is24={hourFormat}
                  isFav={isFavorite(item, favorites)}
                  updateFavorites={updateFavorites}
                />
              ))}
            </List.Section>
          ) : (
            <List.EmptyView
              icon={{ source: "now-icon.png" }}
              title="Search for a City"
              description="Search for a city (e.g. Berlin) to learn what time it is there now. Save multiple cities to your favorites get your time in each one."
            />
          )}
        </>
      ) : (
        <List.Section title="Results" subtitle={results.length + ""}>
          {results.map((item, key) => (
            <ListItem
              key={key}
              item={item}
              is24={hourFormat}
              isFav={isFavorite(item, favorites)}
              updateFavorites={updateFavorites}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ListItem({
  item,
  is24,
  isFav,
  updateFavorites,
}: {
  item: Now;
  is24: boolean;
  isFav: boolean;
  updateFavorites: any;
}) {
  return (
    <List.Item
      icon={flag(item.iso2)}
      title={{ tooltip: item.country, value: item.city }}
      subtitle={is24 ? item.time : item.time12}
      accessories={[{ text: `${item.offset}${item.comparedToMe}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={is24 ? item.time : item.time12} />
            {isFav ? (
              <Action icon={Icon.Star} title="Remove from Favorites" onAction={() => updateFavorites(item, "remove")} />
            ) : (
              <Action icon={Icon.Star} title="Add to Favorites" onAction={() => updateFavorites(item, "add")} />
            )}
          </ActionPanel.Section>
          {isFav ? (
            <ActionPanel.Section>
              <Action
                icon={Icon.ChevronUp}
                title="Move Up in Favorites"
                onAction={() => updateFavorites(item, "up")}
                shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
              />
              <Action
                icon={Icon.ChevronDown}
                title="Move Down in Favorites"
                onAction={() => updateFavorites(item, "down")}
                shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
              />
            </ActionPanel.Section>
          ) : (
            ""
          )}
        </ActionPanel>
      }
    />
  );
}

function useSearch(setFavorites: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Now[]>([]);
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);
      try {
        const results = await performSearch(searchText, setFavorites);
        setResults(results);
      } catch (error) {
        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [cancelRef, setIsLoading, setResults]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [results, isLoading, search] as const;
}
