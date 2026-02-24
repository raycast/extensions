import { MenuBarExtra, Icon, LaunchType, launchCommand } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { createPrusaClientFromPreferences } from "./api/prusaClient";
import { PrusaApiError } from "./api/errors";
import { logger } from "./utils/logger";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Starting...";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function Command() {
  const {
    data: status,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const client = createPrusaClientFromPreferences();
      return await client.getStatus();
    },
    [],
    {
      initialData: undefined,
    },
  );

  // Log errors only when they change
  useEffect(() => {
    if (error) {
      logger.error("Error fetching printer status:", error);
    }
  }, [error]);

  // Handle errors
  if (error) {
    const errorMessage = error instanceof PrusaApiError ? error.message : "Connection failed";

    return (
      <MenuBarExtra icon={Icon.Warning} title="Error" tooltip={errorMessage}>
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={errorMessage} />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  // Handle loading state
  if (isLoading) {
    return <MenuBarExtra icon={Icon.CircleProgress} isLoading={true} />;
  }

  // Don't show menu bar when idle or no active job
  if (!status || !status.job || status.printer.state.toUpperCase() === "IDLE") {
    return null;
  }

  const state = status.printer.state.toUpperCase();
  const progress = status.job.progress;
  const timeRemaining = status.job.time_remaining;
  const timePrinting = status.job.time_printing;

  // Build menu bar title based on state
  let title = "";
  if (state === "PAUSED") {
    title = `⏸️ Paused: ${progress.toFixed(0)}%`;
  } else if (state === "PRINTING") {
    title =
      Number.isFinite(timeRemaining) && timeRemaining >= 0
        ? `${progress.toFixed(0)}% | ${formatTime(timeRemaining)}`
        : `${progress.toFixed(0)}%`;
  } else {
    title = state.charAt(0) + state.slice(1).toLowerCase();
  }

  return (
    <MenuBarExtra icon="command-icon.png" title={title} tooltip="Prusa Printer Status" isLoading={isLoading}>
      <MenuBarExtra.Section title="Print Job">
        <MenuBarExtra.Item title="Progress" subtitle={`${progress.toFixed(1)}%`} icon={Icon.CircleProgress} />
        <MenuBarExtra.Item title="Time Remaining" subtitle={formatTime(timeRemaining)} icon={Icon.Clock} />
        <MenuBarExtra.Item title="Time Elapsed" subtitle={formatTime(timePrinting)} icon={Icon.Stopwatch} />
        <MenuBarExtra.Item title="State" subtitle={state.charAt(0) + state.slice(1).toLowerCase()} icon={Icon.Circle} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Temperatures">
        <MenuBarExtra.Item
          title="Nozzle"
          subtitle={`${status.printer.temp_nozzle.toFixed(1)}°C / ${status.printer.target_nozzle}°C`}
          icon={Icon.Temperature}
        />
        <MenuBarExtra.Item
          title="Bed"
          subtitle={`${status.printer.temp_bed.toFixed(1)}°C / ${status.printer.target_bed}°C`}
          icon={Icon.Temperature}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Printer Status"
          icon={Icon.Window}
          onAction={async () => {
            try {
              await launchCommand({ name: "status", type: LaunchType.UserInitiated });
            } catch (error) {
              console.error("Failed to launch command:", error);
            }
          }}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
