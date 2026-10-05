import { Action, Icon } from "@raycast/api";
import { Fragment } from "react";
import { ClaudeSession } from "./lib/sessions";

export function SessionUtilityActions({
  session,
  isPinned,
  onTogglePin,
}: {
  session: ClaudeSession;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  return (
    <Fragment>
      <Action
        title={isPinned ? "Unpin Session" : "Pin Session"}
        icon={isPinned ? Icon.PinDisabled : Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={onTogglePin}
      />
      <Action.CopyToClipboard
        title="Copy Session Path"
        content={session.cwd}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.ShowInFinder path={session.cwd} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
      <Action.CopyToClipboard
        title="Copy Session Id"
        content={session.id}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      />
    </Fragment>
  );
}
