// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  MenuBarExtra,
  openCommandPreferences,
  environment,
  LaunchType,
  updateCommandMetadata,
} from "@raycast/api";
import { execSync } from "child_process";

interface BatteryInfo {
  percentage: number;
  timeRemaining: string;
  timeRemainingDetailed: string;
  timeRemainingRaw: string;
  isCharging: boolean;
  powerSource: string;
  health: string;
  cycleCount: number;
  temperature: number;
}

function createBatteryIcon(
  percentage: number,
  timeRemaining: string,
  isCharging: boolean,
): string {
  // Determine base icon
  const baseIcon = isCharging ? "⚡" : "🔋";

  // Only show time if it's a valid HH:MM format and not 00:00
  const shouldShowTime =
    timeRemaining &&
    timeRemaining.match(/^\d{1,2}:\d{2}$/) &&
    timeRemaining !== "00:00";

  if (shouldShowTime) {
    // Create compact time format
    const timeMatch = timeRemaining.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);

      // If less than 1 hour, show just minutes (e.g., "45m")
      if (hours === 0) {
        return `${baseIcon}${minutes}m`;
      }
      // If 1+ hours, show hours and minutes compactly (e.g., "2h15")
      else {
        return `${baseIcon}${hours}h${minutes.toString().padStart(2, "0")}`;
      }
    }
    return `${baseIcon}${timeRemaining}`;
  } else {
    return baseIcon;
  }
}

function formatTimeRemaining(
  timeString: string,
  isCharging: boolean,
  percentage: number,
): string {
  // Special case for when battery is at 100% (whether charging or discharging)
  if (percentage === 100) {
    // Show FULL for 100% battery regardless of charging status
    if (timeString.includes("0:00") || timeString.includes("(no estimate)")) {
      console.log(
        `DEBUG: formatTimeRemaining returning "FULL" for percentage=100, timeString="${timeString}"`,
      );
      return "FULL";
    }
  }

  if (isCharging) {
    return "Charging";
  }

  // Handle various time formats from pmset
  if (
    timeString.includes("(no estimate)") ||
    timeString.includes("calculating")
  ) {
    return "--:--";
  }

  // Extract time in HH:MM format
  const timeMatch = timeString.match(/(\d+):(\d+)/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, "0");
    const minutes = timeMatch[2].padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  return "--:--";
}

function formatDetailedTimeRemaining(
  timeString: string,
  isCharging: boolean,
): string {
  // Handle various time formats from pmset - show --:-- when no estimate available
  if (
    timeString.includes("(no estimate)") ||
    timeString.includes("calculating") ||
    timeString.includes("0:00")
  ) {
    return "--:--";
  }

  // Extract time in HH:MM format
  const timeMatch = timeString.match(/(\d+):(\d+)/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, "0");
    const minutes = timeMatch[2].padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // If we're charging but have no time estimate, show --:--
  if (isCharging) {
    return "--:--";
  }

  return "--:--";
}

function getBatteryInfo(): BatteryInfo {
  try {
    // Get battery percentage and charging status
    const batteryInfoRaw = execSync("pmset -g batt", { encoding: "utf-8" });
    const percentageMatch = batteryInfoRaw.match(/(\d+)%/);
    const chargingMatch = batteryInfoRaw.match(
      /(charging|discharging|charged)/,
    );

    // More comprehensive time matching
    const timeMatch = batteryInfoRaw.match(
      /(\d+:\d+)|(\(no estimate\))|calculating/,
    );

    const percentage = percentageMatch ? parseInt(percentageMatch[1], 10) : 0;
    const isCharging = chargingMatch
      ? chargingMatch[1] === "charging" || chargingMatch[1] === "charged"
      : false;
    const timeRemainingRaw = timeMatch ? timeMatch[0] : "calculating";
    const timeRemaining = formatTimeRemaining(
      timeRemainingRaw,
      isCharging,
      percentage,
    );
    const timeRemainingDetailed = formatDetailedTimeRemaining(
      timeRemainingRaw,
      isCharging,
    );

    // Get detailed battery info with fallback for system_profiler
    let health = "Unknown";
    let cycleCount = 0;

    try {
      // Try with full path first, then fallback to PATH
      let powerInfoRaw = "";
      try {
        powerInfoRaw = execSync("/usr/sbin/system_profiler SPPowerDataType", {
          encoding: "utf-8",
        });
      } catch {
        // Fallback to system_profiler in PATH
        powerInfoRaw = execSync("system_profiler SPPowerDataType", {
          encoding: "utf-8",
        });
      }

      const healthMatch = powerInfoRaw.match(/Condition: ([^\n]+)/);
      const cycleMatch = powerInfoRaw.match(/Cycle Count: (\d+)/);

      health = healthMatch ? healthMatch[1].trim() : "Unknown";
      cycleCount = cycleMatch ? parseInt(cycleMatch[1], 10) : 0;
    } catch (error) {
      console.warn("Could not get detailed battery info:", error.message);
      // Continue without detailed info
    }

    // Get temperature (if available) - also optional
    let temperature = 0;
    try {
      const tempRaw = execSync(
        "sudo powermetrics -n 1 -s battery | grep -i temperature",
        {
          encoding: "utf-8",
          timeout: 5000,
        },
      );
      const tempMatch = tempRaw.match(/(\d+\.\d+)/);
      temperature = tempMatch ? parseFloat(tempMatch[1]) : 0;
    } catch {
      // Temperature might not be available or require sudo
      temperature = 0;
    }

    return {
      percentage,
      timeRemaining,
      timeRemainingDetailed,
      timeRemainingRaw,
      isCharging,
      powerSource: isCharging ? "AC Power" : "Battery",
      health,
      cycleCount,
      temperature,
    };
  } catch (error) {
    console.error("Error getting battery info:", error);
    return {
      percentage: 0,
      timeRemaining: "--:--",
      timeRemainingDetailed: "--:--",
      timeRemainingRaw: "Unknown",
      isCharging: false,
      powerSource: "Unknown",
      health: "Unknown",
      cycleCount: 0,
      temperature: 0,
    };
  }
}

export default function Command() {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateBatteryInfo = async () => {
      const info = getBatteryInfo();
      setBatteryInfo(info);
      setIsLoading(false);

      // Update command metadata for root search
      const chargingStatus = info.isCharging ? "Charging" : "Not Charging";
      let subtitle = `${info.percentage}% - ${chargingStatus}`;

      // Add remaining time if it's available and not "--:--" or "FULL"
      if (
        info.timeRemaining &&
        info.timeRemaining !== "--:--" &&
        info.timeRemaining !== "FULL"
      ) {
        subtitle += ` - ${info.timeRemaining}`;
      }

      await updateCommandMetadata({
        subtitle: subtitle,
      });
    };

    updateBatteryInfo();

    // Set up interval for updates (only if not in background)
    let interval: NodeJS.Timeout;
    if (environment.launchType === LaunchType.UserInitiated) {
      interval = setInterval(updateBatteryInfo, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  if (!batteryInfo) {
    return <MenuBarExtra title="🔋--:--" isLoading={isLoading} />;
  }

  // Create battery icon with time inside
  const batteryIcon = createBatteryIcon(
    batteryInfo.percentage,
    batteryInfo.timeRemaining,
    batteryInfo.isCharging,
  );

  return (
    <MenuBarExtra title={batteryIcon} isLoading={isLoading}>
      <MenuBarExtra.Section title="Battery Status">
        <MenuBarExtra.Item
          title={`Level: ${batteryInfo.percentage}%`}
          subtitle={batteryInfo.isCharging ? "Charging" : "Discharging"}
        />
        <MenuBarExtra.Item
          title={`Remaining Time: ${batteryInfo.timeRemainingDetailed}`}
        />
        <MenuBarExtra.Item title={`Power Source: ${batteryInfo.powerSource}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Battery Health">
        <MenuBarExtra.Item title={`Health: ${batteryInfo.health}`} />
        <MenuBarExtra.Item title={`Cycle Count: ${batteryInfo.cycleCount}`} />
        {batteryInfo.temperature > 0 && (
          <MenuBarExtra.Item
            title={`Temperature: ${batteryInfo.temperature.toFixed(1)}°C`}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Preferences"
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
