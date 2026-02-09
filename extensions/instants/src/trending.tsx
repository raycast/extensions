import { useState, useEffect, useCallback } from "react";
import { ActionPanel, Action, Icon, List, showToast, Toast, Color, Keyboard, getPreferenceValues } from "@raycast/api";
import { getTrendingSounds } from "./api/myinstants";
import { playSound, stopCurrentSound } from "./api/audio";
import { toggleFavorite, getFavorites, updateFavoriteLocalPath } from "./utils/storage";
import { downloadSoundToCache } from "./utils/cacheFiles";
import { getCachedResults, setCachedResults } from "./utils/cache";
import { Sound } from "./types";

const TRENDING_CACHE_KEY = "__trending__";

export default function Trending() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavoriteIds(new Set(favs.map((f) => f.id)));
  }, []);

  const loadTrending = useCallback(async () => {
    const cached = getCachedResults(TRENDING_CACHE_KEY);
    if (cached) {
      setSounds(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await getTrendingSounds();
      setCachedResults(TRENDING_CACHE_KEY, results);
      setSounds(results);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to Load Trending", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
    loadFavorites();
  }, [loadTrending, loadFavorites]);

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
        const prefs = getPreferenceValues<{ downloadWhenFavorite?: boolean }>();
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
    <List isLoading={isLoading} searchBarPlaceholder="Filter trending sounds...">
      {sounds.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Trending Sounds"
          description="Could not load trending sounds"
          icon={Icon.ExclamationMark}
        />
      ) : (
        sounds.map((sound, index) => (
          <List.Item
            key={sound.id}
            title={sound.name}
            subtitle={`#${index + 1}`}
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
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadTrending}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
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
