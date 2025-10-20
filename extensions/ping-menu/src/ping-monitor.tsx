import { MenuBarExtra, Icon, LocalStorage, environment, LaunchType } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import React, { useEffect, useState } from "react";

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

export default function Command() {
  const [currentLatency, setCurrentLatency] = useState<number | null>(null);
  const [pingHistory, setPingHistory] = useState<PingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | undefined;

    async function loadHistory() {
      const storedHistory = await LocalStorage.getItem<string>("pingHistory");
      if (!isMounted) return;
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory) as Array<{
            timestamp: string;
            latency: number | null;
            error?: string;
          }>;
          const history: PingResult[] = parsed.map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
          setPingHistory(history);
          if (history.length > 0) {
            setCurrentLatency(history[0].latency);
          }
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }

    async function recordPing() {
      const latency = await pingGoogle();
      if (!isMounted) return;
      setCurrentLatency(latency);

      const newResult: PingResult = {
        timestamp: new Date(),
        latency,
        error: latency === null ? "Failed" : undefined,
      };

      setPingHistory((prev) => {
        const updated = [newResult, ...prev].slice(0, 10);
        LocalStorage.setItem("pingHistory", JSON.stringify(updated));
        return updated;
      });
    }

    // Load cached history first
    loadHistory();

    // Do initial ping
    recordPing().finally(() => setIsLoading(false));

    // Only run continuous interval if NOT a background launch
    // Background launches just do one ping and exit
    if (environment.launchType !== LaunchType.Background) {
      // User-initiated: keep updating every second
      intervalId = setInterval(recordPing, 1000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const menuBarTitle = currentLatency !== null ? `${Math.round(currentLatency)}ms` : "...";

  function iconTintForLatency(lat: number | null): string {
    if (lat === null) return "#8E8E93"; // system gray
    if (lat < 60) return "#2ECC71"; // green
    if (lat < 150) return "#F5A623"; // orange
    return "#FF3B30"; // red
  }

  const menuBarIcon = { source: Icon.Dot, tintColor: iconTintForLatency(currentLatency) } as const;

  const tooltip =
    currentLatency !== null
      ? `google.com: ${Math.round(currentLatency)}ms\nLast ${pingHistory.length > 0 ? pingHistory[0].timestamp.toLocaleTimeString() : "now"}`
      : "Pinging google.com...";

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Raycast API type conflicts with React types
    <MenuBarExtra icon={menuBarIcon} title={menuBarTitle} isLoading={isLoading} tooltip={tooltip}>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <MenuBarExtra.Section title="Recent Pings">
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        {pingHistory.length === 0 && <MenuBarExtra.Item title="No ping results yet..." />}
        {pingHistory.map((result, index) => (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          <MenuBarExtra.Item
            key={index}
            icon={result.latency !== null ? Icon.Dot : Icon.XMarkCircle}
            title={result.latency !== null ? `${Math.round(result.latency)}ms` : "Failed"}
            subtitle={result.timestamp.toLocaleTimeString()}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
