// Emote Search

import * as React from "react";
import { useState, useEffect } from "react";
import { List, LocalStorage, Action, ActionPanel, Icon } from "@raycast/api";
import {
  fetchTrending as fetchBTTVTrending,
  searchEmotes as searchBTTVEmotes,
} from "./lib/bttvService";
import {
  fetchTrending as fetch7TVTrending,
  searchEmotes as search7TVEmotes,
} from "./lib/sevenTVService";
import {
  fetchTrending as fetchFFZTrending,
  searchEmotes as searchFFZEmotes,
} from "./lib/ffzService";
import { getAllFavs } from "./lib/localEmotes";
import {
  copyEmote,
  addToFavorites,
  removeFromFavorites,
  removeFromRecents,
} from "./lib/emoteActions";
import type { Emote } from "./types/emote";

type EmoteSource = "bttv" | "ffz" | "7tv";

const EMOTE_SOURCES = [
  { value: "bttv" as const, label: "BTTV", icon: "../assets/BTTV.png" },
  { value: "ffz" as const, label: "FFZ", icon: "../assets/FFZ.png" },
  { value: "7tv" as const, label: "7TV", icon: "../assets/7TV.png" },
];

const RECENT_KEY = "recent-emotes";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState<EmoteSource>("bttv");
  const [recent, setRecent] = useState<Emote[]>([]);
  const [favorites, setFavorites] = useState<Emote[]>([]);
  const [trending, setTrending] = useState<Emote[]>([]);

  const loadRecent = async () => {
    try {
      const recentEmotes = await LocalStorage.getItem<string>(RECENT_KEY);
      if (recentEmotes) {
        const parsed = JSON.parse(recentEmotes) as Array<{
          id: string;
          url: string;
          name: string;
          source: "bttv" | "ffz" | "7tv";
        }>;
        setRecent(parsed);
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to load recent emotes" });
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      const favs = await getAllFavs();
      setFavorites(favs);
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTrending() {
      setIsLoading(true);
      try {
        const trendingEmotes = await fetchTrending(source);
        if (!cancelled) setTrending(trendingEmotes);
      } catch {
        if (!cancelled) setTrending([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadTrending();
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    async function search() {
      if (!searchText) {
        setEmotes([]);
        return;
      }
      setIsLoading(true);
      try {
        const results = await searchEmotes(source, searchText);
        if (!cancelled) setEmotes(results);
      } catch {
        if (!cancelled) setEmotes([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    search();
    return () => {
      cancelled = true;
    };
  }, [searchText, source]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${source.toUpperCase()} emotes...`}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Emote Source"
          storeValue={true}
          onChange={(newValue) => {
            setSource(newValue as "bttv" | "ffz" | "7tv");
            setSearchText("");
          }}
        >
          {EMOTE_SOURCES.map((s) => (
            <List.Dropdown.Item key={s.value} title={s.label} value={s.value} icon={s.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {searchText ? (
        <List.Section title="Search Results">
          {emotes.map((emote) => (
            <List.Item
              key={`search-${emote.source}-${emote.id}`}
              title={emote.name || "Unknown Emote"}
              icon={{ source: emote.url }}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Clipboard}
                    title="Copy Emote"
                    onAction={() => copyEmote(emote, recent, setRecent)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    icon={Icon.Star}
                    title={
                      favorites.some((f) => f.id === emote.id && f.source === emote.source)
                        ? "Remove from Favorites"
                        : "Add to Favorites"
                    }
                    onAction={() =>
                      favorites.some((f) => f.id === emote.id && f.source === emote.source)
                        ? removeFromFavorites(emote, setFavorites)
                        : addToFavorites(emote, setFavorites)
                    }
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <>
          {favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map((emote) => (
                <List.Item
                  key={`fav-${emote.source}-${emote.id}`}
                  title={emote.name || "Unknown Emote"}
                  icon={{ source: emote.url }}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Clipboard}
                        title="Copy Emote"
                        onAction={() => copyEmote(emote, recent, setRecent)}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action
                        icon={Icon.Star}
                        title="Remove from Favorites"
                        onAction={() => removeFromFavorites(emote, setFavorites)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {recent.length > 0 && (
            <List.Section title="Recent Emotes">
              {recent.map((emote) => (
                <List.Item
                  key={`recent-${emote.source}-${emote.id}`}
                  title={emote.name || "Unknown Emote"}
                  icon={{ source: emote.url }}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Clipboard}
                        title="Copy Emote"
                        onAction={() => copyEmote(emote, recent, setRecent)}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action
                        icon={Icon.Star}
                        title={
                          favorites.some((f) => f.id === emote.id && f.source === emote.source)
                            ? "Remove from Favorites"
                            : "Add to Favorites"
                        }
                        onAction={() =>
                          favorites.some((f) => f.id === emote.id && f.source === emote.source)
                            ? removeFromFavorites(emote, setFavorites)
                            : addToFavorites(emote, setFavorites)
                        }
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      />
                      <Action
                        icon={Icon.Clock}
                        title="Remove from Recents"
                        onAction={() => removeFromRecents(emote, recent, setRecent)}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          <List.Section title="Trending">
            {trending.map((emote) => (
              <List.Item
                key={`trending-${emote.source}-${emote.id}`}
                title={emote.name || "Unknown Emote"}
                icon={{ source: emote.url }}
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.Clipboard}
                      title="Copy Emote"
                      onAction={() => copyEmote(emote, recent, setRecent)}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action
                      icon={Icon.Star}
                      title={
                        favorites.some((f) => f.id === emote.id && f.source === emote.source)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      onAction={() =>
                        favorites.some((f) => f.id === emote.id && f.source === emote.source)
                          ? removeFromFavorites(emote, setFavorites)
                          : addToFavorites(emote, setFavorites)
                      }
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
            {trending.length === 0 && <List.Item title="No trending emotes found" />}
          </List.Section>
        </>
      )}
    </List>
  );
}

export async function fetchTrending(
  source: EmoteSource
): Promise<{ id: string; url: string; name: string; source: "bttv" | "ffz" | "7tv" }[]> {
  if (source === "bttv") return (await fetchBTTVTrending()).map((emote) => ({ ...emote, source }));
  if (source === "7tv") return (await fetch7TVTrending()).map((emote) => ({ ...emote, source }));
  return (await fetchFFZTrending()).map((emote) => ({ ...emote, source }));
}

export async function searchEmotes(
  source: EmoteSource,
  query: string
): Promise<{ id: string; url: string; name: string; source: "bttv" | "ffz" | "7tv" }[]> {
  if (source === "bttv")
    return (await searchBTTVEmotes(query)).map((emote) => ({ ...emote, source }));
  if (source === "7tv")
    return (await search7TVEmotes(query)).map((emote) => ({ ...emote, source }));
  return (await searchFFZEmotes(query)).map((emote) => ({ ...emote, source }));
}
