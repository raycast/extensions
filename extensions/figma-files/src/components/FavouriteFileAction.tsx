import { Action, Icon } from "@raycast/api";
import { File } from "../types";
import { saveFavouriteFiles } from "../hooks/useVisitedFiles";

export function FavouriteFileAction(props: { file: File; isStarred: boolean }) {
  const { file } = props;
  return (
    <Action
      title={props.isStarred == false ? "Favourite this file" : "Unfavourite this file"}
      icon={props.isStarred ? Icon.StarDisabled : Icon.Star}
      onAction={() => saveFavouriteFiles(file)}
    />
  );
}
