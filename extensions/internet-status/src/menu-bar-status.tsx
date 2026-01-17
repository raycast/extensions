import { Icon, MenuBarExtra, Cache, Color, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useCallback, useState } from "react";

interface Preferences {
  refreshInterval: string;
  hideWhenOnline: boolean;
}

interface Status {
  online: boolean;
  timestamp: number;
  offlineSince: number | null;
}

const cache = new Cache();
const CACHE_KEY = "status";
const ENDPOINTS = ["https://captive.apple.com/hotspot-detect.html", "https://cloudflare.com/cdn-cgi/trace"];

async function checkConnectivity(): Promise<boolean> {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function getCache(): Status | null {
  const data = cache.get(CACHE_KEY);
  return data ? (JSON.parse(data) as Status) : null;
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "< 1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 > 0 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 > 0 ? `${d}d ${h % 24}h` : `${d}d`;
}

function formatLastChecked(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 120) return "1 minute ago";
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function Command(): React.ReactElement | null {
  const prefs = getPreferenceValues<Preferences>();
  const interval = parseInt(prefs.refreshInterval, 10) * 1000;
  const [force, setForce] = useState(0);

  const check = useCallback(async (): Promise<Status> => {
    const cached = getCache();
    const now = Date.now();

    if (cached && now - cached.timestamp < interval && force === 0) {
      return cached;
    }

    const online = await checkConnectivity();
    const offlineSince = !online ? (cached?.online === false && cached.offlineSince ? cached.offlineSince : now) : null;

    const status: Status = { online, timestamp: now, offlineSince };
    cache.set(CACHE_KEY, JSON.stringify(status));
    return status;
  }, [interval, force]);

  const { data, isLoading, revalidate } = usePromise(check);

  const status = data ?? getCache();
  const online = status?.online ?? true;
  const offlineSince = status?.offlineSince;

  if (prefs.hideWhenOnline && online && !isLoading) {
    return null;
  }

  const duration = offlineSince ? formatDuration(Date.now() - offlineSince) : null;
  const text = online ? "Online" : duration ? `Offline for ${duration}` : "Offline";
  const icon = { source: Icon.Globe, tintColor: online ? Color.Green : Color.Red };

  return (
    <MenuBarExtra icon={icon} tooltip={`Internet: ${online ? "Online" : "Offline"}`} isLoading={isLoading}>
      <MenuBarExtra.Item title={`Status: ${text}`} icon={online ? Icon.CheckCircle : Icon.XMarkCircle} />
      {status?.timestamp && (
        <MenuBarExtra.Item title={`Last checked: ${formatLastChecked(status.timestamp)}`} icon={Icon.Clock} />
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Check Now"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => {
          setForce((n) => n + 1);
          revalidate();
        }}
      />
      <MenuBarExtra.Item
        title="Copy Status"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={async () => {
          await Clipboard.copy(online ? "Online" : "Offline");
          await showHUD(`Copied: ${online ? "Online" : "Offline"}`);
        }}
      />
    </MenuBarExtra>
  );
}
