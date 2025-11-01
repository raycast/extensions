import { MenuBarExtra, Icon, LocalStorage, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PingResult {
  timestamp: Date;
  latency: number | null;
  error?: string;
}

async function pingGoogle(): Promise<number | null> {
  try {
    const { stdout } = await execAsync("/sbin/ping -c 1 -W 1000 google.com");
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

async function pingWithHistory(): Promise<PingData> {
  // Perform ping
  const latency = await pingGoogle();

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
  const { data, isLoading, revalidate } = useCachedPromise(pingWithHistory, [], {
    initialData: { latency: null, history: [] },
    keepPreviousData: true,
  });

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
      ? `google.com: ${Math.round(currentLatency)}ms\nLast ${pingHistory.length > 0 ? pingHistory[0].timestamp.toLocaleTimeString() : "now"}`
      : "Pinging google.com...";

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
