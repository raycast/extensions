import { Action, Icon, open, showHUD } from "@raycast/api";

export function ActionOpenFolder() {
  return (
    <Action
      icon={Icon.Finder}
      title={"Open Bunch Folder"}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={async () => {
        await open(encodeURI("x-bunch://reveal"));
        await showHUD("Open Bunch Folder");
      }}
    />
  );
}
