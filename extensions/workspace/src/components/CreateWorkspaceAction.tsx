import { Action, ActionPanel, Keyboard, LocalStorage, Icon } from "@raycast/api";
import { Workspace } from "../types";
import { runAppleScript } from "run-applescript";
import { url } from "inspector";
import { CreateWorkspaceForm } from ".";

function CreateWorkspaceAction(props: { draftValue?: Workspace; onCreate: (workspace: Workspace) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Create Workspace"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateWorkspaceForm draftValue={props.draftValue} onCreate={props.onCreate} />}
    />
  );

}

export default CreateWorkspaceAction;
