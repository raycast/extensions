import { Action, Icon, openExtensionPreferences } from "@raycast/api";
import { AgentSetup } from "./AgentSetup";

/** Setup remains available from the session workflow, separate from native preferences. */
export function ConnectionActions() {
  return (
    <>
      <Action.Push title="Connect an Agent" icon={Icon.Plug} target={<AgentSetup />} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
}
