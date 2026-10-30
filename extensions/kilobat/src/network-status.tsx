import { Action, ActionPanel, Detail, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { noticeCard, statusCard } from "./cards";
import { ErrorView, KilobatAppAction } from "./components";
import { image } from "./draw";
import { Conditions, kilobat, WiFi } from "./kilobat";

type Snapshot = { wifi?: WiFi; conditions: Conditions };

async function load(): Promise<Snapshot> {
  const [wifi, conditions] = await Promise.all([
    kilobat<WiFi>(["wifi", "--json"]).catch(() => undefined),
    kilobat<Conditions>(["conditions", "--json"]),
  ]);
  return { wifi, conditions };
}

function summary({ wifi, conditions: c }: Snapshot) {
  return [
    wifi?.powered
      ? `Wi-Fi: ${wifi.ssid ?? "connected"}, signal ${wifi.score}/100 (${wifi.rssi} dBm), ${wifi.band}, channel ${wifi.channel}`
      : "Wi-Fi: off",
    c.connected
      ? `Internet: ${Math.round(c.internetLatencyMs ?? 0)} ms, ${c.internetLossPercent ?? 0}% loss`
      : "Internet: offline",
    `VPN: ${c.vpn ? (c.vpnName ?? "on") : "off"}`,
    `Metered: ${c.metered ? "yes" : "no"}`,
  ].join("\n");
}

export default function Command() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [latencies, setLatencies] = useState<number[]>([]);
  const [error, setError] = useState<Error>();
  const [attempt, setAttempt] = useState(0);
  const stopped = useRef(false);

  // Polls every few seconds so the latency line moves while the window is open.
  useEffect(() => {
    stopped.current = false;
    let timer: NodeJS.Timeout | undefined;
    const poll = async () => {
      try {
        const next = await load();
        if (stopped.current) return;
        setSnapshot(next);
        setError(undefined);
        const latency = next.conditions.internetLatencyMs;
        if (latency != null) setLatencies((values) => [...values, latency].slice(-40));
      } catch (caught) {
        if (!stopped.current) setError(caught as Error);
      }
      if (!stopped.current) timer = setTimeout(poll, 2500);
    };
    poll();
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  if (error && !snapshot) return <ErrorView error={error} onRetry={() => setAttempt(attempt + 1)} />;

  return (
    <Detail
      isLoading={!snapshot}
      navigationTitle="Network Status"
      markdown={
        snapshot
          ? image(statusCard(snapshot.wifi, snapshot.conditions, latencies), 700, "Network status")
          : image(noticeCard("Network status", "Reading Wi-Fi, latency, VPN and power…", { tagText: "Listening" }), 700)
      }
      actions={
        <ActionPanel>
          <Action
            title="Check a Site"
            icon={Icon.MagnifyingGlass}
            onAction={() => launchCommand({ name: "why", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Run Speed Test"
            icon={Icon.Gauge}
            onAction={() => launchCommand({ name: "speed-test", type: LaunchType.UserInitiated })}
          />
          {snapshot ? (
            <Action.CopyToClipboard
              title="Copy Summary"
              content={summary(snapshot)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          <KilobatAppAction title="Open Health in Kilobat" link="open/health" />
        </ActionPanel>
      }
    />
  );
}
