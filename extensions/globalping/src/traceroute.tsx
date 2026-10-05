import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import {
  MeasurementType,
  getProbeResultKeys,
  getShareUrl,
  type ProbeResult,
  type TracerouteHop,
  type TracerouteResult,
} from "./api/globalping";
import { globalpingOAuth } from "./oauth";
import { EditLocationAction } from "./components/LocationPicker";
import {
  getProbeFlagIcon,
  formatProbeLabel,
  formatProbeListTitle,
  formatProbeSubtitle,
  formatTracerouteResultAsMarkdown,
} from "./utils/formatters";
import { getProbeLimitPreference } from "./utils/preferences";
import { createTracerouteQuicklink } from "./utils/quicklinks";
import { getCurrentLocationHint, getRefreshActionHint } from "./utils/shortcuts";
import { useRecentLocations } from "./hooks/useLocationDirectory";
import { useMeasurement } from "./hooks/useMeasurement";

interface SubmittedTracerouteRequest {
  target: string;
  from: string;
}

// Detail view for one probe

/**
 * Formats one traceroute hop into a readable single-line summary.
 */
function formatTracerouteHopText(hop: TracerouteHop): string {
  const host = hop.resolvedHostname || hop.resolvedAddress || "—";
  const ip =
    hop.resolvedHostname && hop.resolvedAddress && hop.resolvedAddress !== hop.resolvedHostname
      ? ` (${hop.resolvedAddress})`
      : "";
  const timings = hop.timings?.map((timing) => `${timing.rtt} ms`).join(" / ") || "—";
  return `${host}${ip} - ${timings}`;
}

/**
 * Converts traceroute hops into metadata rows for the detail panel.
 */
function buildTracerouteHopPreview(hops: TracerouteHop[]): Array<{ title: string; text: string }> {
  return hops.map((hop, index) => ({
    title: `Hop ${index + 1}`,
    text: formatTracerouteHopText(hop),
  }));
}

/**
 * Renders the detail pane for a single traceroute probe result.
 */
function ProbeDetail({ probeResult, target }: { probeResult: ProbeResult; target: string }) {
  const result = probeResult.result as TracerouteResult;
  const probe = probeResult.probe;
  const label = formatProbeLabel(probe);
  const failed = result.status === "failed" || result.status === "offline";
  const inProgress = result.status === "in-progress";
  const hops = result.hops ?? [];
  const lastHop = hops[hops.length - 1];
  const destination =
    lastHop == null
      ? "—"
      : lastHop.resolvedAddress && lastHop.resolvedAddress !== lastHop.resolvedHostname
        ? `${lastHop.resolvedHostname} (${lastHop.resolvedAddress})`
        : lastHop.resolvedHostname || lastHop.resolvedAddress || "—";
  const hopPreview = buildTracerouteHopPreview(hops);

  return (
    <List.Item.Detail
      markdown={inProgress ? "*Tracing route…*" : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Target" text={target} />
          <List.Item.Detail.Metadata.Label title="Location" text={label} icon={getProbeFlagIcon(probe)} />
          <List.Item.Detail.Metadata.Label title="Network" text={formatProbeSubtitle(probe)} />
          <List.Item.Detail.Metadata.Separator />
          {failed ? (
            <>
              <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Failed", color: Color.Red }} />
              <List.Item.Detail.Metadata.Label title="Result" text={getTracerouteFailureMessage(result)} />
            </>
          ) : inProgress ? (
            <>
              <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Running", color: Color.Yellow }} />
              <List.Item.Detail.Metadata.Label title="Hops discovered" text={String(hops.length)} />
            </>
          ) : (
            <>
              <List.Item.Detail.Metadata.Label title="Status" text="Finished" />
              <List.Item.Detail.Metadata.Label title="Hops" text={String(hops.length)} />
              <List.Item.Detail.Metadata.Label title="Destination" text={destination} />
            </>
          )}
          {!failed && hops.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {!failed &&
            hopPreview.map((hop) => (
              <List.Item.Detail.Metadata.Label key={`${hop.title}-${hop.text}`} title={hop.title} text={hop.text} />
            ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Extracts a short traceroute failure message for the UI.
 */
function getTracerouteFailureMessage(result: TracerouteResult): string {
  const rawOutput = result.rawOutput?.trim();
  if (!rawOutput) {
    return "The probe could not complete the traceroute.";
  }

  return rawOutput;
}

// Main command

function Command(props: LaunchProps<{ arguments: Arguments.Traceroute }>) {
  const { token } = getAccessToken();

  return (
    <TracerouteCommand
      authToken={token}
      initialTarget={props.arguments.target ?? ""}
      initialFrom={props.arguments.from?.trim() || ""}
    />
  );
}

/**
 * Main Raycast command for running Globalping traceroute measurements.
 */
function TracerouteCommand({
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
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedTracerouteRequest | null>(null);
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
      { type: MeasurementType.TRACEROUTE, target: trimmedTarget, locations: [{ magic: f }], limit: defaultProbeLimit },
      `Traceroute to ${trimmedTarget}…`,
    );
  }

  // Actions

  function buildActions() {
    const requestTarget = submittedRequest?.target ?? target;
    const requestFrom = submittedRequest?.from ?? selectedFrom;
    const finishedResults =
      measurement?.results.filter((r) => (r.result as TracerouteResult).status !== "in-progress") ?? [];

    const markdownOutputs = finishedResults
      .map((r) =>
        formatTracerouteResultAsMarkdown(requestTarget, formatProbeLabel(r.probe), r.result as TracerouteResult),
      )
      .join("\n\n");

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
              content={markdownOutputs}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Share Link" content={getShareUrl(measurement.id)} />
            <Action.CreateQuicklink
              title="Create Raycast Quicklink"
              icon={Icon.Star}
              quicklink={createTracerouteQuicklink(requestTarget, requestFrom)}
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
  const hasResults = isRunning || currentCount > 0;
  const resultKeys = measurement ? (measurement.resultKeys ?? getProbeResultKeys(measurement.results)) : [];
  const actions = buildActions();
  const detailTarget = submittedRequest?.target ?? target;

  return (
    <List
      navigationTitle={`Traceroute from ${selectedFrom}`}
      isShowingDetail={hasResults}
      isLoading={isRunning}
      searchBarPlaceholder="Target (e.g. google.com)"
      searchText={target}
      onSearchTextChange={setTarget}
      actions={actions}
    >
      {isRunning && currentCount === 0 && <List.EmptyView title="Contacting probes…" icon={Icon.Clock} />}
      {!hasResults && (
        <List.EmptyView
          title={target ? getRefreshActionHint(`traceroute ${target}`) : "Enter a target to get started"}
          description={getCurrentLocationHint(selectedFrom)}
          icon={Icon.Network}
        />
      )}

      {measurement?.results.map((probeResult, index) => {
        const result = probeResult.result as TracerouteResult;
        const label = formatProbeListTitle(probeResult.probe);
        const isFinished = result.status !== "in-progress";
        const failed = result.status === "failed" || result.status === "offline";
        const hopCount = result.hops?.length ?? 0;

        return (
          <List.Item
            id={resultKeys[index]}
            key={resultKeys[index]}
            icon={getProbeFlagIcon(probeResult.probe)}
            title={label}
            accessories={
              isFinished
                ? failed
                  ? [
                      {
                        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
                        text: "Failed",
                        tooltip: getTracerouteFailureMessage(result),
                      },
                    ]
                  : [{ text: `${hopCount} hops` }]
                : [{ icon: Icon.Clock, text: "Running…" }]
            }
            detail={<ProbeDetail probeResult={probeResult} target={detailTarget} />}
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
