import { useCachedState } from "@raycast/utils";
import type { SoundboardItem } from "./discord";
import { ActionPanel, Action, Icon, showToast } from "@raycast/api";

export function useFavorites() {
  const [favorites, setFavorites] = useCachedState<string[]>("favorites", []);

  return {
    favorites,
    favorite: (item: SoundboardItem) => setFavorites((prev) => [item.id, ...prev]),
    unfavorite: (item: SoundboardItem) => setFavorites((prev) => prev.filter((id) => id !== item.id)),
    unfavoriteAll: () => setFavorites([]),
    moveLeft: (item: SoundboardItem) =>
      setFavorites((prev) => {
        const i = prev.indexOf(item.id);
        if (i === -1 || i === 0) return prev;

        const newArray = [...prev];
        [newArray[i - 1], newArray[i]] = [newArray[i], newArray[i - 1]];
        return newArray;
      }),
    moveRight: (item: SoundboardItem) =>
      setFavorites((prev) => {
        const i = prev.indexOf(item.id);
        if (i === -1 || i === prev.length - 1) return prev;

        const newArray = [...prev];
        [newArray[i], newArray[i + 1]] = [newArray[i + 1], newArray[i]];
        return newArray;
      }),
    canMovePosition: (item: SoundboardItem, position: "left" | "right") => {
      const i = favorites.indexOf(item.id);
      if (position === "left") {
        return i > 0;
      } else {
        return i < favorites.length - 1;
      }
    },
  };
}

export function FavoritesActionSection(props: { item: SoundboardItem; isFavorite?: boolean } & FavoriteMethods) {
  const { item, isFavorite, ...methods } = props;

  const itemTitle = item.emojiName ? `${item.emojiName} ${item.name}` : item.name;

  return !isFavorite ? (
    <ActionPanel.Section>
      <Action
        title={`Favorite ${itemTitle}`}
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={async () => {
          methods.favorite(item);
          await showToast({
            title: `Favorite ${itemTitle}`,
          });
        }}
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section>
      <Action
        title={`Unfavorite ${itemTitle}`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        icon={Icon.PinDisabled}
        onAction={async () => {
          methods.unfavorite(item);
          await showToast({
            title: `Unfavorite ${itemTitle}`,
          });
        }}
      />
      {methods.canMovePosition(item, "left") && (
        <Action
          title="Move Left in Favorites"
          shortcut={{ modifiers: ["shift", "opt"], key: "arrowLeft" }}
          icon={Icon.ArrowLeft}
          onAction={async () => {
            methods.moveLeft(item);
            await showToast({ title: `Moved ${itemTitle} left` });
          }}
        />
      )}
      {methods.canMovePosition(item, "right") && (
        <Action
          title="Move Right in Favorites"
          shortcut={{ modifiers: ["shift", "opt"], key: "arrowRight" }}
          icon={Icon.ArrowRight}
          onAction={async () => {
            methods.moveRight(item);
            await showToast({ title: `Moved ${itemTitle} right` });
          }}
        />
      )}
      <Action
        title="Unfavorite All"
        icon={Icon.PinDisabled}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
        style={Action.Style.Destructive}
        onAction={async () => {
          props.unfavoriteAll();
          await showToast({ title: "Unfavorite all sounds" });
        }}
      />
    </ActionPanel.Section>
  );
}

export type FavoriteMethods = {
  favorite: (item: SoundboardItem) => void;
  unfavorite: (item: SoundboardItem) => void;
  unfavoriteAll: () => void;
  moveLeft: (item: SoundboardItem) => void;
  moveRight: (item: SoundboardItem) => void;
  canMovePosition: (item: SoundboardItem, position: "left" | "right") => boolean;
};
