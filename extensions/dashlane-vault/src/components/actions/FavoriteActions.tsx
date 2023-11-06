import { Action, Icon } from "@raycast/api";

import { useFavoritesContext } from "@/context/favorites";

type Props = {
  item: { id: string };
};

export default function FavoriteActions({ item }: Props) {
  const { add, remove, moveDown, moveUp, isFavorite } = useFavoritesContext();

  return isFavorite(item.id) ? (
    <>
      <Action
        title={"Remove Favorite"}
        onAction={() => remove(item.id)}
        icon={Icon.StarDisabled}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />

      <Action
        title="Move Favorite Up"
        onAction={() => moveUp(item.id)}
        icon={Icon.ArrowUpCircleFilled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      />
      <Action
        title="Move Favorite Down"
        onAction={() => moveDown(item.id)}
        icon={Icon.ArrowDownCircleFilled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      />
    </>
  ) : (
    <Action
      title={"Add Favorite"}
      onAction={() => add(item.id)}
      icon={Icon.Star}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
    />
  );
}
