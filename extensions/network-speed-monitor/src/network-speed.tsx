import { MenuBarExtra, launchCommand, LaunchType, open, Icon, Cache } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import React, { useEffect, useState } from "react";

const execPromise = promisify(exec);

interface NetworkStats {
  bytesReceived: number;
  bytesSent: number;
}

interface SpeedData {
  download: string;
  upload: string;
}

// Get the active network interface dynamically
async function getActiveInterface(): Promise<string> {
  try {
    const { stdout } = await execPromise(
      "/sbin/route get default | /usr/bin/grep interface | /usr/bin/awk '{print $2}'"
    );
    const iface = stdout.trim();
    return iface || "en0"; // fallback to en0
  } catch {
    return "en0";
  }
}

async function getNetworkStats(): Promise<NetworkStats> {
  try {
    const iface = await getActiveInterface();
    // Sanitize interface name to prevent command injection (only allow valid interface name chars)
    const safeIface = iface.replace(/[^a-zA-Z0-9._-]/g, "");
    if (!safeIface) return { bytesReceived: 0, bytesSent: 0 };
    const command = `/usr/sbin/netstat -ib | /usr/bin/grep -E '${safeIface}.*Link' | /usr/bin/head -1 | /usr/bin/awk '{print $7, $10}'`;
    const { stdout } = await execPromise(command);
    const trimmed = stdout.trim();
    if (!trimmed) return { bytesReceived: 0, bytesSent: 0 };

    const parts = trimmed.split(/\s+/);
    const bytesReceived = parseInt(parts[0], 10) || 0;
    const bytesSent = parseInt(parts[1], 10) || 0;
    return { bytesReceived, bytesSent };
  } catch {
    return { bytesReceived: 0, bytesSent: 0 };
  }
}

function formatSpeed(bytesPerSecond: number): string {
  const absSpeed = Math.abs(bytesPerSecond);

  if (absSpeed < 1024) {
    return `${absSpeed.toFixed(0)} B/s`;
  } else if (absSpeed < 1024 * 1024) {
    return `${(absSpeed / 1024).toFixed(1)} KB/s`;
  } else if (absSpeed < 1024 * 1024 * 1024) {
    return `${(absSpeed / (1024 * 1024)).toFixed(1)} MB/s`;
  } else {
    return `${(absSpeed / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
  }
}

const cache = new Cache();
const CACHE_KEY_PREV_STATS = "prevStats";

export default function Command() {
  const [speed, setSpeed] = useState<SpeedData>({ download: "0 B/s", upload: "0 B/s" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateSpeed = async () => {
      const currentStats = await getNetworkStats();
      const prevStatsStr = cache.get(CACHE_KEY_PREV_STATS);
      const prevStats: NetworkStats | null = prevStatsStr ? JSON.parse(prevStatsStr) : null;

      if (prevStats && prevStats.bytesReceived > 0) {
        const downloadSpeed = currentStats.bytesReceived - prevStats.bytesReceived;
        const uploadSpeed = currentStats.bytesSent - prevStats.bytesSent;

        // Handle counter resets (wrap-around or interface reset)
        if (downloadSpeed < 0 || uploadSpeed < 0) {
          // Counter reset detected, skip this update
          cache.set(CACHE_KEY_PREV_STATS, JSON.stringify(currentStats));
          return;
        }

        setSpeed({
          download: formatSpeed(downloadSpeed),
          upload: formatSpeed(uploadSpeed),
        });
      }

      cache.set(CACHE_KEY_PREV_STATS, JSON.stringify(currentStats));
      setIsLoading(false);
    };

    updateSpeed();
    const interval = setInterval(updateSpeed, 1000);
    return () => clearInterval(interval);
  }, []);

  const menuBarTitle = isLoading ? "..." : `↓ ${speed.download} ↑ ${speed.upload}`;

  return (
    <MenuBarExtra title={menuBarTitle} isLoading={isLoading}>
      <MenuBarExtra.Section title="Network Speed">
        <MenuBarExtra.Item title={`Download: ${speed.download}`} icon={Icon.Download} />
        <MenuBarExtra.Item title={`Upload: ${speed.upload}`} icon={Icon.Upload} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Network Settings"
          icon={Icon.Gear}
          onAction={() => open("x-apple.systempreferences:com.apple.preference.network")}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={() => {
            launchCommand({
              name: "network-speed",
              type: LaunchType.Background,
            });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
