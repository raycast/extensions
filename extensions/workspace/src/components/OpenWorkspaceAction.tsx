import { Action, Icon } from "@raycast/api";
import { Workspace } from "../types";
function OpenWorkspaceAction(props: { onOpen: () => void }) {
  return (
    <Action
      icon={Icon.List}
      title="Open Workspace"
      onAction={props.onOpen}
    />
  )
}
export default OpenWorkspaceAction;

