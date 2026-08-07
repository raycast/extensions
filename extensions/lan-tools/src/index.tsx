import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  List,
  Toast,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { runSweepStreaming } from "./sweep";
import { loadState } from "./state";
import { raycastStorage } from "./storage";
import { primaryInterface } from "./scan";
import { probeServices } from "./services";
import type { Device, MDNSService } from "./types";
import { DeviceDetail } from "./detail";
import PingCommand from "./ping";
import TracerouteCommand from "./traceroute";
import DnsLookupCommand from "./dns-lookup";

const STATUS_ICON: Record<string, { source: Image.Source; tintColor: string }> =
  {
    online: { source: Icon.Dot, tintColor: "#34d399" },
    idle: { source: Icon.Dot, tintColor: "#fbbf24" },
    offline: { source: Icon.Dot, tintColor: "#6b7280" },
    unknown: { source: Icon.Dot, tintColor: "#60a5fa" },
  };

type SortKey = "ip" | "name" | "vendor" | "lastSeen";
type FilterKey =
  "all" | "online" | "stable" | "transient" | "apple" | "sonos" | "unknown";

/**
 * My LAN. Cached devices render instantly when on the same network as the last
 * sweep; otherwise devices stream in live: arp first, mDNS names + advertised
 * services as they resolve. Sweep progress shows in Raycast's native status
 * bar (the list loading indicator) while scanning.
 */
export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<
    "cached" | "arp" | "mdns" | "ping" | "done"
  >("cached");

  const [sort, setSort] = useCachedState<SortKey>("lanradar.sort", "ip");
  const [filter, setFilter] = useCachedState<FilterKey>(
    "lanradar.filter",
    "all",
  );
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const sweep = async () => {
    setIsLoading(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Scanning local network…",
    });
    try {
      await runSweepStreaming((next, p) => {
        setDevices(next);
        setPhase(p);
      });
      setPhase("done");
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Scan complete",
      });
    } catch (e) {
      setIsLoading(false);
      setPhase("done");
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: String(e),
      });
    }
  };

  useEffect(() => {
    (async () => {
      const state = await loadState(raycastStorage);
      const iface = primaryInterface();
      const onSameNetwork =
        state.network &&
        iface &&
        state.network.ip === iface.ip &&
        state.network.prefixLen === iface.prefixLen;

      if (onSameNetwork && Object.keys(state.devices).length > 0) {
        setDevices(Object.values(state.devices));
        setPhase("cached");
        setIsLoading(false);
        sweep();
      } else {
        sweep();
      }
    })();
  }, []);

  const visibleDevices = sortedBy(applyFilter(devices, filter), sort);

  // Manual "Probe Web & SSH" action: runs rustscan against the device and
  // reports the result as a transient HUD toast. Does NOT change the panel
  // (the panel's Advertised Services come from mDNS; the probe is a
  // supplemental check for networks where AP isolation isn't in effect).
  const probeAndToast = (mac: string) => {
    const target = devices.find((d) => d.mac === mac);
    if (!target) return;
    const ip = target.ips[0];
    // Skip self-scan: probing this Mac against itself only ever finds the
    // machine's own listening services and is meaningless for an inventory.
    const self = primaryInterface()?.ip;
    if (self && ip === self) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Can't probe self",
        message: "This is this Mac — no point self-scanning.",
      });
      return;
    }
    void (async () => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Checking web & ssh…",
      });
      const { services, engineMissing } = await probeServices(ip);
      if (engineMissing) {
        await showToast({
          style: Toast.Style.Failure,
          title: "rustscan not installed",
          message: "brew install rustscan to enable service probing",
        });
        return;
      }
      if (services.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Probe complete",
          message: "No web/ssh services found (host may be isolated).",
        });
        return;
      }
      const label = services.map((s) => `${s.name} ${s.port}`).join(", ");
      await showToast({
        style: Toast.Style.Success,
        title: "Probe complete",
        message: `${ip}: ${label}`,
      });
    })();
  };

  const toggleDetail = () => {
    setIsShowingDetail((v) => !v);
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search name, IP, MAC…"
      throttle
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={toggleDetail}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <FilterDropdown onFilter={setFilter} onSort={setSort} />
      }
    >
      {visibleDevices.length > 0 ? (
        <List.Section title={`Devices (${visibleDevices.length})`}>
          {visibleDevices.map((d) => (
            <DeviceListItem
              key={d.mac}
              device={d}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
              onProbe={probeAndToast}
              onSwept={() => sweep()}
            />
          ))}
        </List.Section>
      ) : (
        <EmptyState phase={phase} onSweep={() => sweep()} />
      )}
    </List>
  );
}

function FilterDropdown({
  onFilter,
  onSort,
}: {
  onFilter: (f: FilterKey) => void;
  onSort: (s: SortKey) => void;
}) {
  const FILTERS: FilterKey[] = [
    "all",
    "online",
    "stable",
    "transient",
    "apple",
    "sonos",
    "unknown",
  ];
  const SORTS: SortKey[] = ["ip", "name", "vendor", "lastSeen"];
  return (
    <List.Dropdown
      tooltip="Filter and sort"
      onChange={(v) => {
        if (FILTERS.includes(v as FilterKey)) onFilter(v as FilterKey);
        else if (SORTS.includes(v as SortKey)) onSort(v as SortKey);
      }}
    >
      <List.Dropdown.Section title="Filter">
        <List.Dropdown.Item title="All" value="all" />
        <List.Dropdown.Item title="Online" value="online" />
        <List.Dropdown.Item title="Stable" value="stable" />
        <List.Dropdown.Item title="Transient" value="transient" />
        <List.Dropdown.Item title="Vendor: Apple" value="apple" />
        <List.Dropdown.Item title="Vendor: Sonos" value="sonos" />
        <List.Dropdown.Item title="Vendor: Unknown" value="unknown" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Sort">
        <List.Dropdown.Item title="IP (numeric)" value="ip" />
        <List.Dropdown.Item title="Name" value="name" />
        <List.Dropdown.Item title="Vendor" value="vendor" />
        <List.Dropdown.Item title="Last seen" value="lastSeen" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function EmptyState({
  phase,
  onSweep,
}: {
  phase: "cached" | "arp" | "mdns" | "ping" | "done";
  onSweep: () => void;
}) {
  const sweeping = phase !== "done" && phase !== "cached";
  if (sweeping) {
    return (
      <List.EmptyView
        icon={{ source: Icon.CircleProgress, tintColor: "#34d399" }}
        title="Scanning local network…"
        description="arp and mDNS results will appear in a moment."
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.Network}
      title="No devices"
      description="Run a scan to discover devices on this network."
      actions={
        <ActionPanel>
          <Action
            title="Scan Now"
            icon={Icon.RotateClockwise}
            onAction={onSweep}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

function DeviceListItem({
  device,
  isShowingDetail,
  onToggleDetail,
  onProbe,
  onSwept,
}: {
  device: Device;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onProbe: (mac: string) => void;
  onSwept: () => void;
}) {
  const status = STATUS_ICON[device.status] ?? STATUS_ICON.unknown;
  const webURL = webUrl(device);
  const sshURL = sshUrl(device);
  const summary = deviceSummary(device);
  const accessories: List.Item.Accessory[] = [];
  if (webURL) {
    accessories.push({
      icon: { source: Icon.Window, tintColor: Color.Blue },
      tooltip: "Web panel",
    });
  }
  accessories.push({ text: device.ips[0] });

  return (
    <List.Item
      id={device.mac}
      icon={status}
      title={device.name ?? device.ips[0]}
      subtitle={device.vendorShort ?? device.vendor}
      accessories={accessories}
      keywords={[device.name ?? "", device.mac, ...device.ips]}
      detail={
        isShowingDetail ? (
          <List.Item.Detail metadata={<DeviceDetail device={device} />} />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            onAction={onToggleDetail}
          />
          <Action
            title="Probe Web & SSH"
            icon={Icon.MagnifyingGlass}
            onAction={() => onProbe(device.mac)}
          />
          {webURL && (
            <>
              <Action.OpenInBrowser
                title="Open Web Panel"
                icon={Icon.Globe}
                url={webURL}
              />
              <Action.CreateQuicklink
                title="Create Web Panel Quicklink"
                icon={Icon.Bookmark}
                quicklink={{
                  name: `${device.name ?? device.ips[0]} web panel`,
                  link: webURL,
                }}
              />
            </>
          )}
          {sshURL && (
            <Action.OpenInBrowser
              title="Connect Via SSH"
              icon={Icon.Terminal}
              url={sshURL}
            />
          )}
          <Action.Push
            title="Ping"
            icon={Icon.FullSignal}
            target={
              <PingCommand
                launchType={LaunchType.UserInitiated}
                arguments={{ host: device.ips[0] }}
              />
            }
          />
          <Action.Push
            title="Traceroute"
            icon={Icon.Network}
            target={
              <TracerouteCommand
                launchType={LaunchType.UserInitiated}
                arguments={{ host: device.ips[0] }}
              />
            }
          />
          <Action.Push
            title="DNS Lookup"
            icon={Icon.Globe}
            target={
              <DnsLookupCommand
                launchType={LaunchType.UserInitiated}
                arguments={{ host: device.ips[0] }}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Summary"
            content={summary}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy MAC"
            content={device.mac}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
          <Action.CopyToClipboard
            title="Copy IP"
            content={device.ips[0]}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <ActionPanel.Section>
            <Action
              title="Scan Now"
              icon={Icon.RotateClockwise}
              onAction={onSwept}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Apply the active filter to the device list. */
function applyFilter(devices: Device[], filter: FilterKey): Device[] {
  switch (filter) {
    case "online":
      return devices.filter((d) => d.status === "online");
    case "stable":
      return devices.filter((d) => d.bucket === "stable");
    case "transient":
      return devices.filter((d) => d.bucket === "transient");
    case "apple":
      return devices.filter((d) =>
        (d.vendor ?? "").toLowerCase().includes("apple"),
      );
    case "sonos":
      return devices.filter((d) =>
        (d.vendor ?? "").toLowerCase().includes("sonos"),
      );
    case "unknown":
      return devices.filter(
        (d) => !d.vendor || d.vendor === "unknown" || d.vendor === "",
      );
    default:
      return devices;
  }
}

/** Sort the device list by the chosen key. */
function sortedBy(devices: Device[], sort: SortKey): Device[] {
  const copy = [...devices];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    case "vendor":
      return copy.sort((a, b) =>
        (a.vendorShort ?? a.vendor ?? "").localeCompare(
          b.vendorShort ?? b.vendor ?? "",
        ),
      );
    case "lastSeen":
      return copy.sort((a, b) => b.lastSeen - a.lastSeen);
    case "ip":
    default:
      return copy.sort((a, b) => ipValue(a.ips[0]) - ipValue(b.ips[0]));
  }
}

function ipValue(ip: string): number {
  return ip.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

/** Formatted summary block for "Copy Summary" action. */
function deviceSummary(d: Device): string {
  const lines = [
    d.name ?? d.ips[0],
    d.vendorShort ?? d.vendor ?? "unknown vendor",
    `IP: ${d.ips.join(", ")}`,
    `MAC: ${d.mac}`,
  ];
  lines.push(`Status: ${d.status}`);
  lines.push(`Class: ${d.deviceClass}`);
  lines.push(`Last seen: ${relativeTime(d.lastSeen)}`);
  lines.push(`Last online: ${relativeTime(d.lastOnline)}`);
  return lines.join("\n");
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() / 1000 - ts);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Build the web-panel URL from mDNS-advertised _https/_http services. */
export function webUrl(d: Device): string | undefined {
  const svcs = d.mdnsServices ?? [];
  const https = svcs.find((s) => s.type === "_https._tcp" && s.port);
  if (https) return `https://${d.ips[0]}:${https.port}`;
  const http = svcs.find((s) => s.type === "_http._tcp" && s.port);
  if (http) return `http://${d.ips[0]}:${http.port}`;
  return undefined;
}

/** Build the ssh:// URL from an mDNS-advertised _ssh service. */
export function sshUrl(d: Device): string | undefined {
  const ssh = (d.mdnsServices ?? []).find(
    (s: MDNSService) => s.type === "_ssh._tcp" && s.port,
  );
  if (!ssh) return undefined;
  return `ssh://${d.ips[0]}:${ssh.port}`;
}
