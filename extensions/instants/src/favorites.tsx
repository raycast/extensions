import { useState, useEffect, useCallback } from "react";
import { existsSync } from "fs";
import { ActionPanel, Action, Icon, List, showToast, Toast, Color, Keyboard } from "@raycast/api";
import { playSound, stopCurrentSound } from "./api/audio";
import { getFavorites, removeFavorite } from "./utils/storage";
import { Sound } from "./types";

export default function Favorites() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const favs = await getFavorites();
      setSounds(favs);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to Load Favorites", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handlePlay = useCallback(async (sound: Sound) => {
    const source = sound.localPath && existsSync(sound.localPath) ? sound.localPath : sound.soundUrl;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Playing", message: sound.name });
    try {
      await playSound(source);
      toast.style = Toast.Style.Success;
      toast.title = "Played";
      toast.message = sound.name;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Playback Failed";
      toast.message = String(error);
    }
  }, []);

  const handleRemoveFavorite = useCallback(
    async (sound: Sound) => {
      await removeFavorite(sound.id);
      await showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: sound.name });
      await loadFavorites();
    },
    [loadFavorites],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={sounds.length > 0 ? `Favorite Instants (${sounds.length})` : "Favorite Instants"}
      searchBarPlaceholder="Filter favorites..."
    >
      {sounds.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Favorites Yet"
          description="Search for sounds and add them to favorites"
          icon={Icon.Star}
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
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: "Favorite",
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
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={() => handleRemoveFavorite(sound)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
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
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
