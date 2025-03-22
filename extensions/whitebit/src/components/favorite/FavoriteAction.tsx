import { Action } from "@raycast/api";

interface Props {
  favorite: boolean;
  onFavorite: () => void;
  onUnfavorite: () => void;
}

export function FavoriteAction(props: Props) {
  return (
    <Action
      onAction={props.favorite ? props.onUnfavorite : props.onFavorite}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      title={props.favorite ? "Remove From Favorite" : "Add to Favorite"}
    />
  );
}
