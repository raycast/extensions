// Dig Up: Rebuild Index. Embeds every file again; search by name keeps working meanwhile.

import { Alert, Toast, confirmAlert, showHUD, showToast } from "@raycast/api";
import { api } from "./lib/client";
import { hasCode } from "./lib/status-text";
import { refreshMenuBar } from "./ui/menu-bar";
import { preferencesSent } from "./ui/prefs";

export default async function Command() {
  const sure = await confirmAlert({
    title: "Rebuild the index?",
    message:
      "Dig Up reads and embeds every file again, as on the first pass. Search by name keeps working meanwhile, and " +
      "search by meaning fills in as it goes.",
    icon: { source: "icon.png" },
    primaryAction: { title: "Rebuild", style: Alert.ActionStyle.Destructive },
  });
  if (!sure) return;
  try {
    // A rebuild embeds everything again, with the model, llama-server and indexing rules the preferences name.
    await preferencesSent();
    const status = await api("GET /status");
    await api("POST /reindex", {});
    if (hasCode(status)) await api("POST /reindex", { code: true });
    await showHUD(hasCode(status) ? "Rebuilding the index and the code index" : "Rebuilding the index");
    await refreshMenuBar();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Dig Up couldn't rebuild the index",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
