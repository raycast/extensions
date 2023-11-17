import { Action, Icon, Keyboard } from "@raycast/api";
import { shareableChecklist } from "../lib/util";
import { Checklist } from "../types";

function ShareChecklistAction(props: { checklist: Checklist }) {
  return (
    <Action.CopyToClipboard
      icon={Icon.Link}
      title="Share Quest"
      content={JSON.stringify(shareableChecklist(props.checklist))}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

export default ShareChecklistAction;
