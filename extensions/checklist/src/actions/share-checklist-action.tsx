import { Action, Icon, Keyboard } from "@raycast/api";
import { shareableChecklist } from "../lib/util";
import { Checklist } from "../types";

export function ShareChecklistAction(props: { checklist: Checklist }) {
  return (
    <Action.CopyToClipboard
      icon={Icon.Link}
      title="Share Checklist"
      content={JSON.stringify(shareableChecklist(props.checklist))}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}
