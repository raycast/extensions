import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runAgentcfg } from "./lib/agentcfg";

export default async function main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Syncing…" });
  try {
    const out = await runAgentcfg(["sync"]);
    if (out.includes("everything up to date")) {
      toast.style = Toast.Style.Success;
      toast.title = "Everything up to date";
      return;
    }
    // Output is one row per synced item, plus a header and any
    // "backup created:" line.
    const synced = out
      .trim()
      .split("\n")
      .filter((l) => l && !l.startsWith("TARGET") && !l.startsWith("backup created:")).length;
    toast.style = Toast.Style.Success;
    toast.title = `Synced ${synced} item${synced === 1 ? "" : "s"}`;
  } catch (error) {
    toast.hide();
    await showFailureToast(error, { title: "Sync failed" });
  }
}
