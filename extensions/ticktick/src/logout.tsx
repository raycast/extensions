import { showHUD, confirmAlert, Alert, Icon, getPreferenceValues } from "@raycast/api";
import { provider } from "./api/oauth";
import { clearStoredInboxId } from "./api/inbox";
import { clearPomodoroState } from "./lib/pomodoro-state";
import { clearAlerts } from "./lib/alerts";
import { clearCachedTaskCounts } from "./lib/menu-bar-cache";

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();

export default async function Logout() {
  if (integrationMode === "applescript") {
    await showHUD("Nothing to disconnect — AppleScript mode uses no stored tokens.");
    return;
  }

  const confirmed = await confirmAlert({
    title: "Disconnect TickTick",
    message: "This will remove your stored tokens. You'll need to re-authenticate next time.",
    icon: Icon.Person,
    primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return;

  await provider.client.removeTokens();
  await clearStoredInboxId();
  await clearPomodoroState();
  await clearAlerts();
  await clearCachedTaskCounts();
  await showHUD("Disconnected from TickTick");
}
