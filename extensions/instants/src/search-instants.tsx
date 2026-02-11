import { useState, useEffect, useCallback, useRef } from "react";
import { ActionPanel, Action, Icon, List, showToast, Toast, Color, Keyboard, getPreferenceValues } from "@raycast/api";
import { searchSounds } from "./api/myinstants";
import { playSound, stopCurrentSound } from "./api/audio";
import { toggleFavorite, getFavorites, updateFavoriteLocalPath } from "./utils/storage";
import { downloadSoundToCache } from "./utils/cacheFiles";
import { getCachedResults, setCachedResults } from "./utils/cache";
import { Sound } from "./types";

export default function SearchInstants() {
  const [searchText, setSearchText] = useState("");
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const loadFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavoriteIds(new Set(favs.map((f) => f.id)));
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSounds([]);
      return;
    }

    const cached = getCachedResults(query);
    if (cached) {
      setSounds(cached);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchSounds(query);
      setCachedResults(query, results);
      setSounds(results);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Search Failed", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(text), 300);
    },
    [performSearch],
  );

  const handlePlay = useCallback(async (sound: Sound) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Playing", message: sound.name });
    try {
      await playSound(sound.soundUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Played";
      toast.message = sound.name;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Playback Failed";
      toast.message = String(error);
    }
  }, []);

  const handleToggleFavorite = useCallback(
    async (sound: Sound) => {
      const isFav = await toggleFavorite(sound);
      if (isFav) {
        const prefs = getPreferenceValues<Preferences>();
        if (prefs.downloadWhenFavorite !== false) {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Downloading…",
            message: sound.name,
          });
          try {
            const localPath = await downloadSoundToCache(sound);
            await updateFavoriteLocalPath(sound.id, localPath);
            toast.style = Toast.Style.Success;
            toast.title = "Added to Favorites";
            toast.message = sound.name;
          } catch (e) {
            toast.style = Toast.Style.Failure;
            toast.title = "Added (download failed)";
            toast.message = String(e);
          }
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "Added to Favorites",
            message: sound.name,
          });
        }
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: sound.name,
        });
      }
      await loadFavorites();
    },
    [loadFavorites],
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search sounds on MyInstants..."
      throttle
    >
      {sounds.length === 0 && !isLoading && searchText.length > 0 ? (
        <List.EmptyView title="No Sounds Found" description="Try a different search term" icon={Icon.MagnifyingGlass} />
      ) : sounds.length === 0 && !isLoading ? (
        <List.EmptyView title="Search MyInstants" description="Type to search for sound clips" icon={Icon.Music} />
      ) : (
        sounds.map((sound) => (
          <List.Item
            key={sound.id}
            title={sound.name}
            icon={{ source: Icon.Play, tintColor: sound.color || Color.PrimaryText }}
            accessories={[
              {
                icon: {
                  source: favoriteIds.has(sound.id) ? Icon.Star : Icon.StarDisabled,
                  tintColor: favoriteIds.has(sound.id) ? Color.Yellow : Color.SecondaryText,
                },
                tooltip: favoriteIds.has(sound.id) ? "Favorite" : "Not in favorites",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Playback">
                  <Action title="Play Sound" icon={Icon.Play} onAction={() => handlePlay(sound)} />
                  <Action title="Stop Sound" icon={Icon.Stop} onAction={() => stopCurrentSound()} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Actions">
                  <Action
                    title={favoriteIds.has(sound.id) ? "Remove from Favorites" : "Add to Favorites"}
                    icon={favoriteIds.has(sound.id) ? Icon.StarDisabled : Icon.Star}
                    onAction={() => handleToggleFavorite(sound)}
                    shortcut={
                      favoriteIds.has(sound.id) ? Keyboard.Shortcut.Common.Remove : Keyboard.Shortcut.Common.Pin
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={sound.name}
                    icon={Icon.Document}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={sound.pageUrl}
                    icon={Icon.Link}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={sound.pageUrl}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action.OpenInBrowser
                    title="Download Sound"
                    url={sound.soundUrl}
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
