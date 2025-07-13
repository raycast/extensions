import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  confirmAlert,
  open,
  Color,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { PrusaClient, createPrusaClientFromPreferences } from "./api/prusaClient";
import { PrusaApiError } from "./api/errors";
import { PrinterStatus, PrinterInfo } from "./api/types";
import { logger } from "./utils/logger";

interface Preferences {
  printerIP: string;
  apiKey: string;
  requestTimeout?: string;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getProgressAccessories(progress: number, timeRemaining: number, timePrinting: number) {
  const accessories = [];

  // Progress indicator
  if (progress > 0) {
    accessories.push({
      icon: progress >= 100 ? Icon.CheckCircle : Icon.CircleProgress,
      tooltip: `Progress: ${progress.toFixed(1)}%`,
    });
  }

  // Time indicators
  if (timeRemaining > 0) {
    accessories.push({
      text: `${formatTime(timeRemaining)} remaining`,
      icon: Icon.Clock,
      tooltip: "Estimated time remaining",
    });
  }
  if (timePrinting > 0) {
    accessories.push({
      text: `${formatTime(timePrinting)} elapsed`,
      icon: Icon.Stopwatch,
      tooltip: "Time elapsed",
    });
  }

  return accessories;
}

function getStateColor(state: string): Color {
  switch (state.toUpperCase()) {
    case "PRINTING":
      return Color.Green;
    case "PAUSED":
      return Color.Yellow;
    case "FINISHED":
      return Color.Blue;
    case "STOPPED":
    case "ERROR":
      return Color.Red;
    case "IDLE":
    default:
      return Color.SecondaryText;
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [printerInfo, setPrinterInfo] = useState<PrinterInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const fetchPrinterInfo = useCallback(async (client: PrusaClient) => {
    try {
      const info = await client.getPrinterInfo();
      setPrinterInfo(info);
    } catch (e) {
      logger.error("Error fetching printer info:", e);
      // Don't show error toast for printer info - it's not critical
    }
  }, []);

  const fetchStatus = useCallback(
    async (isRetry = false) => {
      try {
        logger.debug("Fetching preferences...");

        const client = createPrusaClientFromPreferences();

        const printerStatus = await client.getStatus();
        setStatus(printerStatus);
        setError(null);
        setRetryCount(0);

        // Fetch printer info if we don't have it yet
        if (!printerInfo) {
          await fetchPrinterInfo(client);
        }
      } catch (e) {
        logger.error("Error in fetchStatus:", e);
        const message =
          e instanceof PrusaApiError ? e.message : e instanceof Error ? e.message : "An unexpected error occurred";

        // Handle network errors with automatic retry
        if (e instanceof PrusaApiError && e.retryable && retryCount < MAX_RETRIES) {
          await showToast({
            style: Toast.Style.Animated,
            title: `Connection failed (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
            message: "Retrying...",
          });

          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            fetchStatus(true);
          }, RETRY_DELAY);
          return;
        }

        setError(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: message,
        });

        // Show network diagnostics if it's a connection error
        if (e instanceof PrusaApiError && !e.statusCode) {
          setError(
            `${message}\n\nTroubleshooting Steps:\n1. Check if printer is powered on\n2. Verify printer IP address (${getPreferenceValues<Preferences>().printerIP})\n3. Ensure you're on the same network\n4. Try accessing printer web interface`,
          );
        }
      } finally {
        if (!isRetry) {
          setIsLoading(false);
        }
      }
    },
    [retryCount, printerInfo, fetchPrinterInfo],
  );

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (status?.printer.state.toUpperCase() !== "IDLE") {
        fetchStatus();
      }
    }, 5000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchStatus, status]);

  async function handlePausePrint() {
    if (!status?.job?.id) return;

    try {
      const shouldPause = await confirmAlert({
        title: "Pause Print",
        message: `Pause printing? The printer will complete the current move.\n\nProgress: ${status.job.progress}%\nTime Remaining: ${formatTime(status.job.time_remaining)}`,
        primaryAction: {
          title: "Pause Print",
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!shouldPause) return;

      const client = createPrusaClientFromPreferences();

      await client.pausePrint(status.job.id.toString());
      await showToast({
        style: Toast.Style.Success,
        title: "Print Paused",
      });
      await fetchStatus();
    } catch (e) {
      const message = e instanceof PrusaApiError ? e.message : "Failed to pause print";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    }
  }

  async function handleResumePrint() {
    if (!status?.job?.id) return;

    try {
      const shouldResume = await confirmAlert({
        title: "Resume Print",
        message: `Resume printing from ${status.job.progress}%?\n\nMake sure the print bed is clear and nozzle is clean.`,
        primaryAction: {
          title: "Resume Print",
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!shouldResume) return;

      const client = createPrusaClientFromPreferences();

      await client.resumePrint(status.job.id.toString());
      await showToast({
        style: Toast.Style.Success,
        title: "Print Resumed",
      });
      await fetchStatus();
    } catch (e) {
      const message = e instanceof PrusaApiError ? e.message : "Failed to resume print";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    }
  }

  async function handleCancelPrint() {
    if (!status?.job?.id) return;

    try {
      const shouldCancel = await confirmAlert({
        title: "Cancel Print",
        message: `⚠️ Are you sure you want to cancel the current print?\n\nProgress: ${status.job.progress}%\nTime Printed: ${formatTime(status.job.time_printing)}\n\nThis action cannot be undone.`,
        primaryAction: {
          title: "Cancel Print",
        },
        dismissAction: {
          title: "Keep Printing",
        },
      });

      if (!shouldCancel) return;

      const client = createPrusaClientFromPreferences();

      await client.cancelPrint(status.job.id.toString());
      await showToast({
        style: Toast.Style.Success,
        title: "Print Cancelled",
      });
      await fetchStatus();
    } catch (e) {
      const message = e instanceof PrusaApiError ? e.message : "Failed to cancel print";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    }
  }

  logger.debug("Rendering component with state:", { isLoading, hasError: !!error, hasStatus: !!status });

  if (error) {
    return (
      <List
        isLoading={isLoading}
        navigationTitle="Printer Status"
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setRetryCount(0);
                  setIsLoading(true);
                  fetchStatus();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={() => open("raycast://preferences")}
                shortcut={{ modifiers: ["cmd"], key: "," }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Connection Error"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setRetryCount(0);
                  setIsLoading(true);
                  fetchStatus();
                }}
              />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={() => open("raycast://preferences")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={printerInfo ? printerInfo.model : "Printer Status"}
      actions={
        <ActionPanel>
          {status?.job?.id && (
            <ActionPanel.Section>
              {status.printer.state.toUpperCase() === "PRINTING" && (
                <Action
                  title="Pause Print"
                  icon={Icon.Pause}
                  onAction={handlePausePrint}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
              )}
              {status.printer.state.toUpperCase() === "PAUSED" && (
                <Action
                  title="Resume Print"
                  icon={Icon.Play}
                  onAction={handleResumePrint}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              )}
              {(status.printer.state.toUpperCase() === "PRINTING" ||
                status.printer.state.toUpperCase() === "PAUSED") && (
                <Action
                  title="Cancel Print"
                  icon={Icon.XMarkCircle}
                  onAction={handleCancelPrint}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                />
              )}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={fetchStatus}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {status ? (
        <>
          {printerInfo && (
            <List.Item
              icon={Icon.Print}
              title={printerInfo.model || "Prusa Printer"}
              subtitle={printerInfo.name || printerInfo.hostname}
            />
          )}

          <List.Section title="Actions">
            {status.job?.id && (
              <>
                {status.printer.state.toUpperCase() === "PRINTING" && (
                  <List.Item
                    icon={Icon.Pause}
                    title="Pause Print"
                    actions={
                      <ActionPanel>
                        <Action
                          title="Pause Print"
                          icon={Icon.Pause}
                          onAction={handlePausePrint}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        />
                      </ActionPanel>
                    }
                  />
                )}
                {status.printer.state.toUpperCase() === "PAUSED" && (
                  <List.Item
                    icon={Icon.Play}
                    title="Resume Print"
                    actions={
                      <ActionPanel>
                        <Action
                          title="Resume Print"
                          icon={Icon.Play}
                          onAction={handleResumePrint}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        />
                      </ActionPanel>
                    }
                  />
                )}
                {(status.printer.state.toUpperCase() === "PRINTING" ||
                  status.printer.state.toUpperCase() === "PAUSED") && (
                  <List.Item
                    icon={Icon.XMarkCircle}
                    title="Cancel Print"
                    actions={
                      <ActionPanel>
                        <Action
                          title="Cancel Print"
                          icon={Icon.XMarkCircle}
                          onAction={handleCancelPrint}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                        />
                      </ActionPanel>
                    }
                  />
                )}
              </>
            )}
            <List.Item
              icon={Icon.ArrowClockwise}
              title="Refresh"
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchStatus}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Print Job Status">
            <List.Item
              icon={getStateIcon(status.printer.state)}
              title="Status"
              subtitle={status.printer.state}
              accessories={[
                {
                  icon: {
                    source: Icon.Circle,
                    tintColor: getStateColor(status.printer.state),
                  },
                  tooltip: `Printer is ${status.printer.state.toLowerCase()}`,
                },
              ]}
            />
            {status.job?.id && (
              <>
                <List.Item
                  icon={Icon.CircleProgress}
                  title="Progress"
                  subtitle={`${status.job.progress.toFixed(1)}%`}
                  accessories={getProgressAccessories(
                    status.job.progress,
                    status.job.time_remaining,
                    status.job.time_printing,
                  )}
                />
              </>
            )}
          </List.Section>

          <List.Section title="Temperatures">
            <List.Item
              icon={Icon.Temperature}
              title="Nozzle"
              subtitle={`${status.printer.temp_nozzle.toFixed(1)}°C / ${status.printer.target_nozzle}°C`}
              accessories={[
                {
                  icon: {
                    source: getTemperatureIcon(status.printer.temp_nozzle, status.printer.target_nozzle),
                    tintColor: getTemperatureColor(status.printer.temp_nozzle, status.printer.target_nozzle),
                  },
                  tooltip: getTemperatureTooltip(status.printer.temp_nozzle, status.printer.target_nozzle),
                },
              ]}
            />
            <List.Item
              icon={Icon.Temperature}
              title="Bed"
              subtitle={`${status.printer.temp_bed.toFixed(1)}°C / ${status.printer.target_bed}°C`}
              accessories={[
                {
                  icon: {
                    source: getTemperatureIcon(status.printer.temp_bed, status.printer.target_bed),
                    tintColor: getTemperatureColor(status.printer.temp_bed, status.printer.target_bed),
                  },
                  tooltip: getTemperatureTooltip(status.printer.temp_bed, status.printer.target_bed),
                },
              ]}
            />
          </List.Section>

          <List.Section title="Print Settings">
            <List.Item icon={Icon.ArrowDown} title="Z Height" subtitle={`${status.printer.axis_z.toFixed(2)}mm`} />
            <List.Item
              icon={Icon.Circle}
              title="Flow Rate"
              subtitle={`${status.printer.flow}%`}
              accessories={[
                {
                  icon: status.printer.flow === 100 ? Icon.CheckCircle : Icon.ExclamationMark,
                  tooltip: status.printer.flow === 100 ? "Normal flow rate" : "Flow rate adjusted",
                },
              ]}
            />
            <List.Item
              icon={Icon.Gauge}
              title="Print Speed"
              subtitle={`${status.printer.speed}%`}
              accessories={[
                {
                  icon: status.printer.speed === 100 ? Icon.CheckCircle : Icon.ExclamationMark,
                  tooltip: status.printer.speed === 100 ? "Normal speed" : "Speed adjusted",
                },
              ]}
            />
            <List.Item
              icon={Icon.Wind}
              title="Fan Speed"
              subtitle={`${Math.min(Math.max(status.printer.fan_print, 0), 100)}%`}
              accessories={[
                {
                  icon: status.printer.fan_print > 0 ? Icon.Play : Icon.Stop,
                  tooltip: status.printer.fan_print > 0 ? "Fan running" : "Fan stopped",
                },
              ]}
            />
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

function getStateIcon(state: string): Icon {
  switch (state.toUpperCase()) {
    case "PRINTING":
      return Icon.Play;
    case "PAUSED":
      return Icon.Pause;
    case "FINISHED":
      return Icon.CheckCircle;
    case "STOPPED":
      return Icon.XMarkCircle;
    case "ERROR":
      return Icon.ExclamationMark;
    case "IDLE":
    default:
      return Icon.Circle;
  }
}

function getTemperatureIcon(current: number, target: number): Icon {
  if (target === 0) return Icon.CircleProgress;
  const diff = Math.abs(current - target);
  if (diff <= 2) return Icon.CheckCircle;
  if (diff <= 5) return Icon.CircleProgress;
  return Icon.ExclamationMark;
}

function getTemperatureTooltip(current: number, target: number): string {
  if (target === 0) return "Not heating";
  const diff = Math.abs(current - target);
  if (diff <= 2) return "At target temperature";
  if (diff <= 5) return "Near target temperature";
  return "Heating";
}

function getTemperatureColor(current: number, target: number): Color {
  if (target === 0) return Color.SecondaryText;
  const diff = Math.abs(current - target);
  if (diff <= 2) return Color.Green;
  if (diff <= 5) return Color.Yellow;
  return Color.Red;
}
