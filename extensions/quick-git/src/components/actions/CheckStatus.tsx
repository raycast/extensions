import { Action, Icon } from "@raycast/api";
import { launchQuickGit } from "../../utils/launchCommands.js";

export function CheckStatus() {
  return <Action title="Check Status" icon={Icon.CheckList} onAction={launchQuickGit} />;
}
