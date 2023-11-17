import { Action, Icon } from "@raycast/api";
function OpenWorkspaceAction(props: { onOpen: () => void }) {
  return <Action icon={Icon.List} title="Open Workspace" onAction={props.onOpen} />;
}
export default OpenWorkspaceAction;
