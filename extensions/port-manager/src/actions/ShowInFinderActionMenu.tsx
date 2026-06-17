import { Action, ActionPanel, Icon } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";

export function ShowInFinderActionMenu(props: { process: ProcessInfo }) {
  return (
    <ActionPanel.Submenu title="Show In Finder" icon={Icon.Finder} shortcut={{ modifiers: ["cmd"], key: "f" }}>
      {props.process.path !== undefined && <Action.ShowInFinder path={props.process.path} title="Executable" />}
      {props.process.parentPath !== undefined && (
        <Action.ShowInFinder path={props.process.parentPath} title="Parent Executable" />
      )}
    </ActionPanel.Submenu>
  );
}
