import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { probeHosts } from "./lib/monitor";
import { connectTerminal, TERMINAL_LABELS } from "./lib/actions";
import { SSHHost, TerminalApp } from "./lib/types";

export async function quickConnect(hosts: SSHHost[], terminal: TerminalApp, timeout: number): Promise<void> {
  if (hosts.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No hosts to scan",
      message: "No hosts in current view",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Scanning hosts...",
    message: `Probing ${hosts.length} hosts`,
  });

  const results = await probeHosts(hosts, timeout);
  const freeHosts = results.filter((r) => r.state === "free");

  if (freeHosts.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No free GPU hosts",
      message: "All hosts are busy or offline",
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

  await closeMainWindow();
  connectTerminal(terminal, best.host);
  await showHUD(`Connecting to ${best.host.name} (${gpuDesc}) via ${TERMINAL_LABELS[terminal]}`);
}
