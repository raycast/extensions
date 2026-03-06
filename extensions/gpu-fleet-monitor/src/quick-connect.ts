import {
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getHosts } from "./lib/ssh-config";
import { probeHosts } from "./lib/monitor";
import { connectTerminal, TERMINAL_LABELS } from "./lib/actions";
import { TerminalApp, getExcludedHosts, parseIdentityList } from "./lib/types";

export default async function QuickConnectBestGPU() {
  const prefs = getPreferenceValues<Preferences>();
  const timeout = parseInt(prefs.sshTimeout || "6", 10) || 6;

  const hosts = getHosts({
    workPatterns: prefs.workPatterns,
    personalPatterns: prefs.personalPatterns,
    workIdentityFiles: parseIdentityList(prefs.workIdentityFiles),
    personalIdentityFiles: parseIdentityList(prefs.personalIdentityFiles),
    excludedHosts: getExcludedHosts(prefs.excludedHosts),
  }).filter((h) => h.category === "work");

  if (hosts.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No work hosts found",
      message: "Check your SSH config or preferences",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Scanning work hosts...",
    message: `Probing ${hosts.length} hosts`,
  });

  const results = await probeHosts(hosts, timeout);
  const freeHosts = results.filter((r) => r.state === "free");

  if (freeHosts.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No free GPU hosts",
      message: "All work hosts are busy or offline",
    });
    return;
  }

  freeHosts.sort((a, b) => {
    if (b.gpus.length !== a.gpus.length) return b.gpus.length - a.gpus.length;
    return b.gpuMemoryTotal - a.gpuMemoryTotal;
  });

  const best = freeHosts[0];
  const gpuDesc =
    best.gpus.length > 0
      ? `${best.gpus.length}x ${best.gpus[0].name}, ${Math.round(best.gpuMemoryTotal / 1024)}GB`
      : "GPU";

  const terminal: TerminalApp = prefs.terminalApp || "ghostty";
  await closeMainWindow();
  connectTerminal(terminal, best.host);
  await showHUD(
    `Connecting to ${best.host.name} (${gpuDesc}) via ${TERMINAL_LABELS[terminal]}`,
  );
}
