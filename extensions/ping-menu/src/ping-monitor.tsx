import { MenuBarExtra, Icon, LocalStorage, Color, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PingResult {
  timestamp: Date;
  latency: number | null;
  error?: string;
}

async function pingHost(host: string): Promise<number | null> {
  // Basic validation - only allow alphanumeric, dots, dashes, and colons (for IPv6)
  // This prevents command injection by ensuring only safe characters are used
  if (!/^[a-zA-Z0-9.\-:]+$/.test(host)) {
    console.error("Invalid host format:", host);
    return null;
  }

  try {
    // Validation ensures host is safe, but we still quote it as an extra precaution
    const { stdout } = await execAsync(`/sbin/ping -c 1 -W 1000 "${host.replace(/"/g, '\\"')}"`);
    const match = stdout.match(/time=(\d+\.?\d*)\s*ms/);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    return null;
  } catch (error) {
    console.error("Ping failed:", error);
    return null;
  }
}

async function loadHistory(): Promise<PingResult[]> {
  const storedHistory = await LocalStorage.getItem<string>("pingHistory");
  if (!storedHistory) return [];

  try {
    const parsed = JSON.parse(storedHistory) as Array<{
      timestamp: string;
      latency: number | null;
      error?: string;
    }>;
    return parsed.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
}

interface PingData {
  latency: number | null;
  history: PingResult[];
}

async function pingWithHistory(host: string): Promise<PingData> {
  // Perform ping
  const latency = await pingHost(host);

  // Load existing history
  const history = await loadHistory();

  // Add new ping result to history
  const newResult: PingResult = {
    timestamp: new Date(),
    latency,
    error: latency === null ? "Failed" : undefined,
  };
  const updated = [newResult, ...history].slice(0, 10);

  // Persist updated history
  await LocalStorage.setItem("pingHistory", JSON.stringify(updated));

  return {
    latency,
    history: updated,
  };
}

export default function Command() {
  const [data, setData] = useState<PingData>({ latency: null, history: [] });
  const [isLoading, setIsLoading] = useState(true);
  const { site, method } = getPreferenceValues<Preferences>();

  useEffect(() => {
    let cancelled = false;
    let isFirstLoad = true;

    async function fetchPing() {
      console.log("[Ping Monitor] Fetching ping at:", new Date().toLocaleTimeString());

      // Load cached data first to prevent flickering on initial load
      if (isFirstLoad) {
        const cachedHistory = await loadHistory();
        if (cachedHistory.length > 0 && !cancelled) {
          // If we have cached data, use it immediately
          setData({
            latency: cachedHistory[0].latency,
            history: cachedHistory,
          });
        }
        setIsLoading(true);
      }

      const result = await pingWithHistory(site);
      if (!cancelled) {
        console.log("[Ping Monitor] Got result, latency:", result.latency);
        setData(result);
        setIsLoading(false);
        isFirstLoad = false;
      }
    }

    // Fetch immediately on mount
    fetchPing();

    // Set up polling interval based on mode.
    // Standard: 10s (matches Raycast background interval for consistency when menu is open)
    // Aggressive: 1s (more frequent updates)
    const pollInterval = method === "aggressive" ? 1000 : 10000;
    const intervalId = setInterval(() => {
      if (!cancelled) {
        fetchPing();
      }
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [site, method]);

  const currentLatency = data?.latency ?? null;
  const pingHistory = data?.history ?? [];

  const menuBarTitle = currentLatency !== null ? `${Math.round(currentLatency)}ms` : "...";

  function iconTintForLatency(lat: number | null): string {
    if (lat === null) return Color.SecondaryText;
    if (lat < 60) return Color.Green;
    if (lat < 150) return Color.Yellow;
    return Color.Red;
  }

  const menuBarIcon = { source: Icon.Dot, tintColor: iconTintForLatency(currentLatency) } as const;

  const tooltip =
    currentLatency !== null
      ? `${site}: ${Math.round(currentLatency)}ms\nLast ${pingHistory.length > 0 ? pingHistory[0].timestamp.toLocaleTimeString() : "now"}`
      : `Pinging ${site}...`;

  return (
    <MenuBarExtra icon={menuBarIcon} title={menuBarTitle} isLoading={isLoading} tooltip={tooltip}>
      <MenuBarExtra.Section title="Recent Pings">
        {pingHistory.length === 0 && <MenuBarExtra.Item title="No ping results yet..." />}
        {pingHistory.map((result: PingResult, index: number) => (
          <MenuBarExtra.Item
            key={`${result.timestamp.getTime()}-${index}`}
            icon={result.latency !== null ? Icon.Dot : Icon.XMarkCircle}
            title={result.latency !== null ? `${Math.round(result.latency)}ms` : "Failed"}
            subtitle={result.timestamp.toLocaleTimeString()}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
