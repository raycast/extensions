import { Action, Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { addFavorite, fetchFavorites, removeFavorite, type Favorite, type FavoriteKind } from "../lib/favorites";

export function useFavorites() {
  return useCachedPromise(fetchFavorites, [], { failureToastOptions: { title: "Couldn't load favorites" } });
}

/** Toggle a person or company in the matching private Cosign list. */
export function FavoriteAction({
  kind,
  id,
  name,
  shortcut = true,
}: {
  kind: FavoriteKind;
  id: string;
  name: string;
  /** Pass false where this is the first or second action: Raycast gives those their own shortcuts. */
  shortcut?: boolean;
}) {
  const { data, mutate } = useFavorites();
  const existing: Favorite | undefined = data?.[kind].find((f) => f.id === id);

  async function toggle() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: existing ? `Removing ${name} from Favorites…` : `Adding ${name} to Favorites…`,
    });
    try {
      await (existing ? removeFavorite(existing) : addFavorite(kind, id));
      await mutate();
      toast.style = Toast.Style.Success;
      toast.title = existing ? `Removed ${name}` : `Favorited ${name}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = existing ? "Couldn't remove favorite" : "Couldn't add favorite";
      toast.message = message;
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
    }
  }

  return (
    <Action
      title={existing ? "Remove from Favorites" : "Add to Favorites"}
      icon={existing ? Icon.StarDisabled : Icon.Star}
      shortcut={
        shortcut
          ? {
              macOS: { modifiers: ["cmd", "shift"], key: "f" },
              Windows: { modifiers: ["ctrl", "shift"], key: "f" },
            }
          : undefined
      }
      onAction={toggle}
    />
  );
}
