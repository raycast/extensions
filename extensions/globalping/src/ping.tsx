import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import { MeasurementType, getProbeResultKeys, getShareUrl, type ProbeResult, type PingResult } from "./api/globalping";
import { globalpingOAuth } from "./oauth";
import { EditLocationAction } from "./components/LocationPicker";
import { useRecentLocations } from "./hooks/useLocationDirectory";
import {
  getProbeFlagIcon,
  formatProbeLabel,
  formatProbeListTitle,
  formatProbeSubtitle,
  getLatencyIcon,
  formatResultsAsMarkdownTable,
} from "./utils/formatters";
import { getProbeLimitPreference } from "./utils/preferences";
import { createPingQuicklink } from "./utils/quicklinks";
import { getCurrentLocationHint, getRefreshActionHint } from "./utils/shortcuts";
import { useMeasurement } from "./hooks/useMeasurement";

interface SubmittedPingRequest {
  target: string;
  from: string;
}

const PING_PACKET_COUNT = 5;
type SuccessfulPingStats = {
  min: number;
  max: number;
  avg: number;
  loss: number;
  total?: number;
  rcv?: number;
  drop?: number;
};

/**
 * Narrows ping results to successful responses with complete aggregate stats.
 */
function hasPingStats(result: PingResult): result is PingResult & { stats: SuccessfulPingStats } {
  return (
    result.stats != null &&
    result.stats.avg != null &&
    result.stats.min != null &&
    result.stats.max != null &&
    result.stats.loss != null
  );
}

/**
 * Extracts a user-friendly failure message from a ping result.
 */
function getPingFailureMessage(result: PingResult): string {
  const rawOutput = result.rawOutput?.trim();
  if (!rawOutput) {
    return "The probe could not complete the ping request.";
  }

  return rawOutput;
}

/**
 * Applies a small Windows-specific provider-name workaround for truncation.
 */
function formatPingProviderName(provider: string): string {
  if (process.platform !== "win32") {
    return provider;
  }

  return provider.replaceAll(" ", "-");
}

/**
 * Preserves dot-separated IP readability while working around Windows text layout quirks.
 */
function formatPingIpAddress(ipAddress: string): string {
  if (process.platform !== "win32") {
    return ipAddress;
  }

  // Word joiner keeps the dots visually intact while changing Windows text layout behavior.
  return ipAddress.replaceAll(".", ".\u2060");
}

// Detail view for one probe

/**
 * Renders the detail pane for a single ping probe result.
 */
function ProbeDetail({ probeResult }: { probeResult: ProbeResult }) {
  const result = probeResult.result as PingResult;
  const probe = probeResult.probe;
  const label = formatProbeLabel(probe);
  const stats = result.stats;
  const receivedCount = stats?.rcv ?? result.timings?.length ?? 0;
  const transmittedCount = stats?.total ?? result.timings?.length ?? 0;
  const samples = result.timings?.slice(0, PING_PACKET_COUNT) ?? [];
  const failed = result.status === "failed" || (result.status !== "in-progress" && !hasPingStats(result));
  const inProgress = result.status === "in-progress";
  const successfulStats = hasPingStats(result) ? result.stats : null;

  return (
    <List.Item.Detail
      markdown={
        failed
          ? `## Ping failed\n\n\`\`\`\n${getPingFailureMessage(result)}\n\`\`\``
          : inProgress
            ? "*Ping in progress…*"
            : undefined
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Location" text={label} icon={getProbeFlagIcon(probe)} />
          <List.Item.Detail.Metadata.Label title="Network" text={formatPingProviderName(formatProbeSubtitle(probe))} />
          {result.resolvedAddress && (
            <List.Item.Detail.Metadata.Label title="IP" text={formatPingIpAddress(result.resolvedAddress)} />
          )}
          {result.resolvedHostname && result.resolvedHostname !== result.resolvedAddress && (
            <List.Item.Detail.Metadata.Label title="Hostname" text={result.resolvedHostname} />
          )}
          <List.Item.Detail.Metadata.Separator />
          {failed ? (
            <>
              <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Failed", color: Color.Red }} />
              <List.Item.Detail.Metadata.Label title="Packets" text={`${receivedCount}/${transmittedCount}`} />
            </>
          ) : inProgress ? (
            <>
              <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Running", color: Color.Yellow }} />
              <List.Item.Detail.Metadata.Label title="Packets" text={`${receivedCount}/${transmittedCount}`} />
            </>
          ) : (
            <>
              {successfulStats ? (
                <>
                  <List.Item.Detail.Metadata.Label title="Avg latency" text={`${successfulStats.avg} ms`} />
                  <List.Item.Detail.Metadata.Label title="Min latency" text={`${successfulStats.min} ms`} />
                  <List.Item.Detail.Metadata.Label title="Max latency" text={`${successfulStats.max} ms`} />
                  <List.Item.Detail.Metadata.Label title="Packet loss" text={`${successfulStats.loss}%`} />
                </>
              ) : (
                <List.Item.Detail.Metadata.Label title="Status" text="Finished" />
              )}
              <List.Item.Detail.Metadata.Label title="Packets" text={`${receivedCount}/${transmittedCount}`} />
            </>
          )}
          {!failed && !inProgress && samples.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {!failed &&
            !inProgress &&
            samples.map((sample, index) => (
              <List.Item.Detail.Metadata.Label
                key={`${sample.ttl}-${sample.rtt}-${index}`}
                title={`Ping ${index + 1}`}
                text={`${sample.rtt} ms  TTL ${sample.ttl}`}
              />
            ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Main command

function Command(props: LaunchProps<{ arguments: Arguments.Ping }>) {
  const { token } = getAccessToken();

  return (
    <PingCommand
      authToken={token}
      initialTarget={props.arguments.target ?? ""}
      initialFrom={props.arguments.from?.trim() || ""}
    />
  );
}

/**
 * Main Raycast command for running Globalping ping measurements.
 */
function PingCommand({
  authToken,
  initialTarget = "",
  initialFrom = "",
}: {
  authToken: string;
  initialTarget?: string;
  initialFrom?: string;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [from, setFrom] = useState(initialFrom);
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedPingRequest | null>(null);
  const defaultProbeLimit = getProbeLimitPreference();
  const { recentLocations, preferredLocation, isLoading: isLocationsLoading } = useRecentLocations();
  const { measurement, isRunning, runTest, probeLimit } = useMeasurement(authToken);
  const selectedFrom = from || preferredLocation || "world";
  const hasAutoRunRef = useRef(false);

  // Auto-run when both arguments are provided

  useEffect(() => {
    if (hasAutoRunRef.current || !initialTarget) {
      return;
    }

    if (!initialFrom && isLocationsLoading) {
      return;
    }

    hasAutoRunRef.current = true;
    void handleRun(initialTarget, initialFrom || preferredLocation || "world");
  }, [initialTarget, initialFrom, preferredLocation, isLocationsLoading]);

  // Run test

  async function handleRun(t: string, f: string) {
    const trimmedTarget = t.trim();

    if (!trimmedTarget) {
      await showToast({ style: Toast.Style.Failure, title: "Target is required" });
      return;
    }

    setSubmittedRequest({ target: trimmedTarget, from: f });
    await runTest(
      {
        type: MeasurementType.PING,
        target: trimmedTarget,
        locations: [{ magic: f }],
        limit: defaultProbeLimit,
        measurementOptions: { packets: PING_PACKET_COUNT },
      },
      `Pinging ${trimmedTarget}…`,
    );
  }

  // Actions

  function buildActions() {
    const requestTarget = submittedRequest?.target ?? target;
    const requestFrom = submittedRequest?.from ?? selectedFrom;
    const finishedResults = measurement?.results.filter((r) => (r.result as PingResult).status !== "in-progress") ?? [];

    const markdownTable = measurement
      ? formatResultsAsMarkdownTable(
          requestTarget,
          finishedResults.map((r) => {
            const pingResult = r.result as PingResult;

            return {
              probe: r.probe,
              min: pingResult.stats?.min ?? undefined,
              max: pingResult.stats?.max ?? undefined,
              avg: pingResult.stats?.avg ?? undefined,
              loss: pingResult.stats?.loss ?? undefined,
            };
          }),
        )
      : "";

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Run Test"
            icon={Icon.Play}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => handleRun(target, selectedFrom)}
          />
          <EditLocationAction
            authToken={authToken}
            currentValue={selectedFrom}
            recentLocations={recentLocations}
            onSelect={setFrom}
          />
        </ActionPanel.Section>
        {measurement && (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Results as Markdown"
              content={markdownTable}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Share Link" content={getShareUrl(measurement.id)} />
            <Action.CreateQuicklink
              title="Create Raycast Quicklink"
              icon={Icon.Star}
              quicklink={createPingQuicklink(requestTarget, requestFrom)}
              shortcut={Keyboard.Shortcut.Common.Save}
            />
          </ActionPanel.Section>
        )}
      </ActionPanel>
    );
  }

  // Render

  const currentCount = measurement?.results.length ?? 0;
  const pendingCount = isRunning ? Math.max(0, probeLimit - currentCount) : 0;
  const hasItems = currentCount > 0 || pendingCount > 0;
  const resultKeys = measurement ? (measurement.resultKeys ?? getProbeResultKeys(measurement.results)) : [];
  const actions = buildActions();

  return (
    <List
      navigationTitle={`Ping from ${selectedFrom}`}
      isShowingDetail={hasItems}
      isLoading={isRunning}
      searchBarPlaceholder="Target (e.g. google.com)"
      searchText={target}
      onSearchTextChange={setTarget}
      actions={actions}
    >
      {!hasItems && (
        <List.EmptyView
          title={target ? getRefreshActionHint(`ping ${target}`) : "Enter a target to get started"}
          description={getCurrentLocationHint(selectedFrom)}
          icon={Icon.Network}
        />
      )}

      {measurement?.results.map((probeResult, index) => {
        const result = probeResult.result as PingResult;
        const label = formatPingProviderName(formatProbeListTitle(probeResult.probe));
        const isFinished = result.status !== "in-progress";
        const successful = hasPingStats(result);
        const failed = isFinished && !successful;

        return (
          <List.Item
            id={resultKeys[index]}
            key={resultKeys[index]}
            icon={getProbeFlagIcon(probeResult.probe)}
            title={label}
            accessories={
              isFinished && successful
                ? [
                    {
                      icon: getLatencyIcon(result.stats.avg),
                      text: `${result.stats.avg} ms`,
                      tooltip: `Min: ${result.stats.min}ms / Max: ${result.stats.max}ms / Loss: ${result.stats.loss}%`,
                    },
                  ]
                : failed
                  ? [
                      {
                        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
                        text: "Failed",
                        tooltip: getPingFailureMessage(result),
                      },
                    ]
                  : [{ icon: Icon.Clock, text: "Running…" }]
            }
            detail={<ProbeDetail probeResult={probeResult} />}
            actions={actions}
          />
        );
      })}

      {Array.from({ length: pendingCount }).map((_, i) => (
        <List.Item
          id={`pending-${i}`}
          key={`pending-${i}`}
          title="Waiting for probe…"
          accessories={[{ icon: Icon.Clock }]}
          detail={<List.Item.Detail markdown="*Waiting for probe response…*" />}
          actions={actions}
        />
      ))}
    </List>
  );
}

export default withAccessToken(globalpingOAuth)(Command);
