import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import {
  HttpRequestMethod,
  MeasurementType,
  getProbeResultKeys,
  getShareUrl,
  type ProbeResult,
  type HttpResult,
} from "./api/globalping";
import { globalpingOAuth } from "./oauth";
import { EditLocationAction } from "./components/LocationPicker";
import {
  getProbeFlagIcon,
  formatProbeLabel,
  formatProbeListTitle,
  formatProbeSubtitle,
  getHttpStatusColor,
  formatHttpResultAsMarkdown,
  formatHttpResultsAsMarkdownTable,
} from "./utils/formatters";
import { getProbeLimitPreference } from "./utils/preferences";
import { createHttpQuicklink } from "./utils/quicklinks";
import { getCurrentLocationHint, getRefreshActionHint } from "./utils/shortcuts";
import { useRecentLocations } from "./hooks/useLocationDirectory";
import { useMeasurement } from "./hooks/useMeasurement";

interface SubmittedHttpRequest {
  target: string;
  from: string;
  method: SupportedHttpMethod;
}

type SupportedHttpMethod = typeof HttpRequestMethod.HEAD | typeof HttpRequestMethod.GET;

/**
 * Restricts incoming HTTP method arguments to the methods supported by the extension.
 */
function normalizeHttpMethod(method?: string): SupportedHttpMethod {
  return method?.toUpperCase() === HttpRequestMethod.GET ? HttpRequestMethod.GET : HttpRequestMethod.HEAD;
}

/**
 * Extracts a user-friendly failure message from an HTTP result.
 */
function getHttpFailureMessage(result: HttpResult): string {
  const rawOutput = result.rawOutput?.trim();
  if (!rawOutput) {
    return "The probe could not complete the HTTP request.";
  }

  return rawOutput;
}

// Detail view for one probe

/**
 * Renders the detail pane for a single HTTP probe result.
 */
function ProbeDetail({ probeResult, target }: { probeResult: ProbeResult; target: string }) {
  const result = probeResult.result as HttpResult;
  const probe = probeResult.probe;
  const label = formatProbeLabel(probe);
  const failed = result.status === "failed" || result.status === "offline";
  const inProgress = result.status === "in-progress";

  return (
    <List.Item.Detail
      markdown={formatHttpResultAsMarkdown(target, label, result)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Location" text={label} icon={getProbeFlagIcon(probe)} />
          <List.Item.Detail.Metadata.Label title="Network" text={formatProbeSubtitle(probe)} />
          <List.Item.Detail.Metadata.Separator />
          {failed ? (
            <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Failed", color: Color.Red }} />
          ) : inProgress ? (
            <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Running", color: Color.Yellow }} />
          ) : (
            <>
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={{
                  value: result.statusCode != null ? String(result.statusCode) : "Finished",
                  color: result.statusCode != null ? getHttpStatusColor(result.statusCode) : Color.SecondaryText,
                }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Total"
                text={result.timings?.total != null ? `${result.timings.total} ms` : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="DNS"
                text={result.timings?.dns != null ? `${result.timings.dns} ms` : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="TCP"
                text={result.timings?.tcp != null ? `${result.timings.tcp} ms` : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="TLS"
                text={result.timings?.tls != null ? `${result.timings.tls} ms` : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="First byte"
                text={result.timings?.firstByte != null ? `${result.timings.firstByte} ms` : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Download"
                text={result.timings?.download != null ? `${result.timings.download} ms` : "—"}
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Main command

function Command(props: LaunchProps<{ arguments: Arguments.Http }>) {
  const { token } = getAccessToken();

  return (
    <HttpCommand
      authToken={token}
      initialTarget={props.arguments.target ?? ""}
      initialFrom={props.arguments.from?.trim() || ""}
      initialMethod={props.arguments.method ?? ""}
    />
  );
}

/**
 * Main Raycast command for running Globalping HTTP measurements.
 */
function HttpCommand({
  authToken,
  initialTarget = "",
  initialFrom = "",
  initialMethod = "",
}: {
  authToken: string;
  initialTarget?: string;
  initialFrom?: string;
  initialMethod?: string;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [from, setFrom] = useState(initialFrom);
  const [method, setMethod] = useState<SupportedHttpMethod>(normalizeHttpMethod(initialMethod));
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedHttpRequest | null>(null);
  const defaultProbeLimit = getProbeLimitPreference();
  const { recentLocations, preferredLocation, isLoading: isLocationsLoading } = useRecentLocations();
  const { measurement, isRunning, runTest, probeLimit } = useMeasurement(authToken);
  const selectedFrom = from || preferredLocation || "world";
  const hasAutoRunRef = useRef(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  // Auto-run when both arguments are provided

  useEffect(() => {
    if (hasAutoRunRef.current || !initialTarget) {
      return;
    }

    if (!initialFrom && isLocationsLoading) {
      return;
    }

    hasAutoRunRef.current = true;
    void handleRun(initialTarget, initialFrom || preferredLocation || "world", normalizeHttpMethod(initialMethod));
  }, [initialTarget, initialFrom, initialMethod, preferredLocation, isLocationsLoading]);

  // Run test

  async function handleRun(t: string, f: string, m: SupportedHttpMethod) {
    const trimmedTarget = t.trim();

    if (!trimmedTarget) {
      await showToast({ style: Toast.Style.Failure, title: "Target is required" });
      return;
    }

    setSubmittedRequest({ target: trimmedTarget, from: f, method: m });
    await runTest(
      {
        type: MeasurementType.HTTP,
        target: trimmedTarget,
        locations: [{ magic: f }],
        limit: defaultProbeLimit,
        measurementOptions: { request: { method: m } },
      },
      `${m} ${trimmedTarget}…`,
    );
  }

  async function applyHttpMethod(nextMethod: SupportedHttpMethod) {
    setMethod(nextMethod);
    if (target.trim()) {
      await handleRun(target, selectedFrom, nextMethod);
    }
  }

  // Actions

  function buildActions() {
    const requestTarget = submittedRequest?.target ?? target;
    const requestFrom = submittedRequest?.from ?? selectedFrom;
    const requestMethod = submittedRequest?.method ?? method;
    const finishedResults = measurement?.results.filter((r) => (r.result as HttpResult).status !== "in-progress") ?? [];

    const markdownTable = measurement
      ? formatHttpResultsAsMarkdownTable(
          requestTarget,
          finishedResults.map((r) => ({
            probe: r.probe,
            statusCode: (r.result as HttpResult).statusCode,
            timings: (r.result as HttpResult).timings,
          })),
        )
      : "";
    const markdownDetails = finishedResults
      .map((result) =>
        formatHttpResultAsMarkdown(requestTarget, formatProbeLabel(result.probe), result.result as HttpResult),
      )
      .join("\n\n");
    const markdownContent = [markdownTable, markdownDetails].filter(Boolean).join("\n\n");

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Run Test"
            icon={Icon.Play}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => handleRun(target, selectedFrom, method)}
          />
          <EditLocationAction
            authToken={authToken}
            currentValue={selectedFrom}
            recentLocations={recentLocations}
            onSelect={setFrom}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="HTTP Methods">
          <Action
            title="Use HEAD"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "h" },
              Windows: { modifiers: ["ctrl", "shift"], key: "h" },
            }}
            onAction={() => applyHttpMethod(HttpRequestMethod.HEAD)}
          />
          <Action
            title="Use GET"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "g" },
              Windows: { modifiers: ["ctrl", "shift"], key: "g" },
            }}
            onAction={() => applyHttpMethod(HttpRequestMethod.GET)}
          />
        </ActionPanel.Section>
        {measurement && (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Results as Markdown"
              content={markdownContent}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Share Link" content={getShareUrl(measurement.id)} />
            <Action.CreateQuicklink
              title="Create Raycast Quicklink"
              icon={Icon.Star}
              quicklink={createHttpQuicklink(requestTarget, requestFrom, requestMethod)}
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
      navigationTitle={`HTTP from ${selectedFrom}`}
      isShowingDetail={hasResults}
      isLoading={isRunning}
      searchBarPlaceholder="URL or hostname (e.g. https://google.com)"
      searchText={target}
      onSearchTextChange={setTarget}
      searchBarAccessory={
        <List.Dropdown
          tooltip="HTTP Method"
          value={method}
          onChange={(value) => {
            if (!hasMountedRef.current || value === method) return;
            void applyHttpMethod(value as SupportedHttpMethod);
          }}
        >
          <List.Dropdown.Item title={HttpRequestMethod.HEAD} value={HttpRequestMethod.HEAD} />
          <List.Dropdown.Item title={HttpRequestMethod.GET} value={HttpRequestMethod.GET} />
        </List.Dropdown>
      }
      actions={actions}
    >
      {isRunning && currentCount === 0 && <List.EmptyView title="Contacting probes…" icon={Icon.Clock} />}
      {!hasResults && (
        <List.EmptyView
          title={target ? getRefreshActionHint(`${method} ${target}`) : "Enter a URL to get started"}
          description={getCurrentLocationHint(selectedFrom)}
          icon={Icon.Globe}
        />
      )}

      {measurement?.results.map((probeResult, index) => {
        const result = probeResult.result as HttpResult;
        const label = formatProbeListTitle(probeResult.probe);
        const isFinished = result.status !== "in-progress";
        const failed = result.status === "failed" || result.status === "offline";

        return (
          <List.Item
            id={resultKeys[index]}
            key={resultKeys[index]}
            icon={getProbeFlagIcon(probeResult.probe)}
            title={label}
            accessories={
              isFinished && !failed && result.statusCode != null
                ? [
                    {
                      tag: { value: String(result.statusCode), color: getHttpStatusColor(result.statusCode) },
                      tooltip: result.timings?.total != null ? `Total: ${result.timings.total}ms` : undefined,
                    },
                    ...(result.timings?.total != null ? [{ text: `${result.timings.total} ms` }] : []),
                  ]
                : failed
                  ? [
                      {
                        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
                        text: "Failed",
                        tooltip: getHttpFailureMessage(result),
                      },
                    ]
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
