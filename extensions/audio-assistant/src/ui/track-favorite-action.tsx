import { Action, Icon, showToast, Toast } from "@raycast/api";
import type { Track } from "../domain/model";
import { validateShortcut } from "../services/shortcut-settings";
import { useMusic } from "./session";
import { useShortcutSettings, useShortcuts } from "./use-shortcuts";

export function TrackFavoriteAction({ track }: { track?: Track }) {
  const { controller, service, run, notifyFavoritesChanged } = useMusic();
  const shortcuts = useShortcuts();
  const { config } = useShortcutSettings();
  const id = track ? "favoriteSelected" : "favoritePlaying";
  const conflict = validateShortcut(id, config[id]!, config);
  return (
    <Action
      title={`${track ? "Toggle Favorite for Selected Track" : "Toggle Favorite for Playing Track"}${conflict ? " (Shortcut Conflict)" : ""}`}
      icon={Icon.Star}
      shortcut={conflict ? undefined : shortcuts[id]}
      onAction={() =>
        run(async () => {
          try {
            const result = track
              ? await service.toggleTrackFavorite(track)
              : await service.toggleCurrentTrackFavorite((await controller.active()).id);
            await showToast({
              style: Toast.Style.Success,
              title: `${service.mode === "demo" ? "Demo: " : ""}${result.favorite ? "Added to Favorites" : "Removed from Favorites"}`,
              message: result.track.name,
            });
          } finally {
            // Also refetch after timeouts: the server may have applied the mutation despite a failed response.
            notifyFavoritesChanged();
          }
        })
      }
    />
  );
}
