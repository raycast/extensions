import { Action, Icon } from "@raycast/api";
import { removeStarredFile, saveStarredFile } from "../starFiles";
import type { File } from "../types";

export function StarFileAction(props: { file: File; isStarred: boolean; revalidate: () => void }) {
  const { file } = props;
  return (
    <Action
      title={props.isStarred === false ? "Star This File" : "Unstar This File"}
      icon={props.isStarred ? Icon.StarDisabled : Icon.Star}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={async () => {
        if (props.isStarred === true) {
          await removeStarredFile(file);
        } else {
          await saveStarredFile(file);
        }
        props.revalidate();
      }}
    />
  );
}
