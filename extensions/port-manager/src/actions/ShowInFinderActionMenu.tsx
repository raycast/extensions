import { Action, ActionPanel, Icon } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";
import { isWindows, platformShortcut } from "../utilities/platform";

export function ShowInFinderActionMenu(props: { process: ProcessInfo }) {
  const title = isWindows ? "Show in File Explorer" : "Show in Finder";

  return (
    <ActionPanel.Submenu
      title={`${title}…`}
      icon={isWindows ? Icon.Folder : Icon.Finder}
      shortcut={platformShortcut({ modifiers: ["cmd"], key: "f" }, { modifiers: ["ctrl"], key: "f" })}
    >
      {props.process.path !== undefined && <Action.ShowInFinder path={props.process.path} title="Executable" />}
      {props.process.parentPath !== undefined && (
        <Action.ShowInFinder path={props.process.parentPath} title="Parent Executable" />
      )}
    </ActionPanel.Submenu>
  );
}
