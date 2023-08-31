import { Action, Icon } from "@raycast/api";
import { File } from "../types";
import { saveStarredFile, removeStarredFile } from "../hooks/useStarredFiles";

export function StarFileAction(props: { file: File; isStarred: boolean }) {
  const { file } = props;
  return (
    <Action
      title={props.isStarred == false ? "Star this file" : "Unstar this file"}
      icon={props.isStarred ? Icon.StarDisabled : Icon.Star}
      onAction={() => (props.isStarred ? removeStarredFile(file) : saveStarredFile(file))}
    />
  );
}
