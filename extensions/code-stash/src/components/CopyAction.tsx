import { Action, Icon } from "@raycast/api";

function CopyAction(props: { onCopy: () => void }) {
  return <Action icon={Icon.Clipboard} title="Copy" onAction={props.onCopy} />;
}

export default CopyAction;
