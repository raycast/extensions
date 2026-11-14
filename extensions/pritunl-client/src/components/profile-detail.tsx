import { Color, environment, List } from "@raycast/api";
import { MonitorPanel, monitorPanel, PANEL_HEIGHT, PANEL_WIDTH, Tone } from "../lib/chart";
import { displayName, formatClock } from "../lib/format";
import { ProfileInfo } from "../lib/profile-info";
import { Profile } from "../lib/types";
import { MonitorState } from "../lib/use-traffic";

export type Pending = "connecting" | "disconnecting";

interface Props {
  profile: Profile;
  pending?: Pending;
  /** Only passed for connected profiles. */
  monitor?: MonitorState;
  windowMs: number;
  /** Seconds the tunnel has been up, counted forward from the last profile refresh. */
  uptime: number;
  info?: ProfileInfo;
}

export function isConnecting(profile: Profile): boolean {
  return profile.run_state === "Active" && !profile.connected;
}

export function statusOf(profile: Profile, pending?: Pending): { label: string; color: Color; tone: Tone } {
  if (pending === "disconnecting") return { label: "Disconnecting", color: Color.Orange, tone: "orange" };
  if (profile.connected) return { label: "Connected", color: Color.Green, tone: "green" };
  if (pending === "connecting" || isConnecting(profile)) {
    return { label: "Connecting", color: Color.Yellow, tone: "yellow" };
  }
  return { label: "Disconnected", color: Color.SecondaryText, tone: "gray" };
}

function panelFor({ profile, pending, monitor, windowMs, uptime, info = {} }: Props): MonitorPanel {
  const status = statusOf(profile, pending);
  const live = profile.connected && monitor?.status === "live" ? monitor : undefined;
  const base: MonitorPanel = {
    name: displayName(profile),
    subtitle: info.user ?? "Pritunl profile",
    status: { label: status.label, tone: status.tone },
    windowMs,
    details: [
      { label: "Client Address", value: (profile.connected && profile.client_address) || "—" },
      { label: "Server Address", value: (profile.connected && profile.server_address) || "—" },
      { label: "Online For", value: profile.connected ? formatClock(uptime) : "—" },
      { label: "Protocol", value: info.protocol ?? "—" },
      { label: "Interface", value: live?.iface ?? "—" },
      { label: "Organization", value: info.organization ?? "—" },
    ],
  };

  if (pending === "disconnecting") {
    return { ...base, empty: { icon: "progress", title: "Disconnecting…", text: "Closing the tunnel." } };
  }
  if (!profile.connected && (pending === "connecting" || isConnecting(profile))) {
    return {
      ...base,
      empty: {
        icon: "progress",
        title: "Connecting…",
        text: "Waiting for the tunnel to come up. For SSO profiles, finish signing in through your browser.",
        hint: "Press ↵ to cancel",
      },
    };
  }
  if (!profile.connected) {
    return {
      ...base,
      empty: {
        icon: "shield",
        title: "No active tunnel",
        text: "Connect this VPN profile to start monitoring its download and upload traffic.",
        hint: "Press ↵ to connect",
      },
    };
  }
  if (!monitor || monitor.status === "off" || monitor.status === "starting") {
    return {
      ...base,
      empty: {
        icon: "progress",
        title: "Finding the tunnel…",
        text: "Looking for the interface that carries this profile's traffic.",
      },
    };
  }
  if (monitor.status === "unavailable") {
    return { ...base, empty: { icon: "warning", title: "Traffic monitoring unavailable", text: `${monitor.reason}.` } };
  }

  const latest = monitor.samples[monitor.samples.length - 1];
  return {
    ...base,
    down: latest?.down,
    up: latest?.up,
    traffic: { samples: monitor.samples, now: Date.now() },
  };
}

export function ProfileDetail(props: Props) {
  const image = monitorPanel(panelFor(props), environment.appearance === "dark");
  return <List.Item.Detail markdown={`<img src="${image}" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" />`} />;
}
