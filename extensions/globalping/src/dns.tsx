import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import {
  DnsQueryType,
  MeasurementType,
  getProbeResultKeys,
  getShareUrl,
  type ProbeResult,
  type DnsResult,
  type DnsAnswer,
} from "./api/globalping";
import { globalpingOAuth } from "./oauth";
import { EditLocationAction } from "./components/LocationPicker";
import {
  getProbeFlagIcon,
  formatProbeLabel,
  formatProbeListTitle,
  formatProbeSubtitle,
  getDnsTypeColor,
  formatDnsResultsAsMarkdownTable,
} from "./utils/formatters";
import { getProbeLimitPreference } from "./utils/preferences";
import { createDnsQuicklink } from "./utils/quicklinks";
import { getCurrentLocationHint, getRefreshActionHint } from "./utils/shortcuts";
import { useRecentLocations } from "./hooks/useLocationDirectory";
import { useMeasurement } from "./hooks/useMeasurement";

interface SubmittedDnsRequest {
  target: string;
  from: string;
  queryType: SupportedDnsQueryType;
}

const SUPPORTED_DNS_QUERY_TYPES = [
  DnsQueryType.A,
  DnsQueryType.AAAA,
  DnsQueryType.ANY,
  DnsQueryType.CNAME,
  DnsQueryType.DNSKEY,
  DnsQueryType.DS,
  DnsQueryType.HTTPS,
  DnsQueryType.MX,
  DnsQueryType.NS,
  DnsQueryType.NSEC,
  DnsQueryType.PTR,
  DnsQueryType.RRSIG,
  DnsQueryType.SOA,
  DnsQueryType.SRV,
  DnsQueryType.SVCB,
  DnsQueryType.TXT,
] as const;

type SupportedDnsQueryType = (typeof SUPPORTED_DNS_QUERY_TYPES)[number];

/**
 * Restricts incoming DNS arguments to the record types supported by the Globalping API.
 */
function normalizeDnsQueryType(queryType?: string): SupportedDnsQueryType {
  const normalizedQueryType = queryType?.toUpperCase();

  return SUPPORTED_DNS_QUERY_TYPES.find((supportedType) => supportedType === normalizedQueryType) ?? DnsQueryType.A;
}

/**
 * Joins DNS answer values for clipboard/export actions.
 */
function formatDnsAnswersForClipboard(answers: DnsAnswer[]): string {
  return answers.map((answer) => answer.value).join(", ");
}

/**
 * Maps DNS results to the shared failed/running/successful UI states.
 */
function isDnsFailed(result: DnsResult): boolean {
  return result.status === "failed" || (result.status !== "in-progress" && (result.answers?.length ?? 0) === 0);
}

/**
 * Extracts a short DNS failure message for list tooltips and detail metadata.
 */
function getDnsFailureMessage(result: DnsResult): string {
  const rawOutput = result.rawOutput?.trim();

  if ((result.status === "failed" || result.status === "offline") && rawOutput) {
    return (
      rawOutput
        .split(/\r?\n/)
        .find((line) => line.trim().length > 0)
        ?.trim() ?? rawOutput
    );
  }

  return (result.answers?.length ?? 0) === 0
    ? "The probe returned no DNS answers."
    : "The probe could not complete the DNS lookup.";
}

/**
 * Applies a Windows-specific provider-name workaround for truncation.
 */
function formatDnsProviderName(provider: string): string {
  if (process.platform !== "win32") {
    return provider;
  }

  return provider.replaceAll(" ", "-");
}

/**
 * Applies Windows-specific invisible joiners to preserve answer readability.
 */
function formatDnsAnswerValue(value: string): string {
  if (process.platform !== "win32") {
    return value;
  }

  return value.replaceAll(".", ".\u2060").replaceAll("-", "-\u2060");
}

// Detail view for one probe

/**
 * Renders the detail pane for a single DNS probe result.
 */
function ProbeDetail({ probeResult, target }: { probeResult: ProbeResult; target: string }) {
  const result = probeResult.result as DnsResult;
  const probe = probeResult.probe;
  const label = formatProbeLabel(probe);
  const answers = result.answers ?? [];
  const failed = isDnsFailed(result);
  const inProgress = result.status === "in-progress";

  return (
    <List.Item.Detail
      markdown={inProgress ? "*DNS lookup in progress…*" : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Hostname" text={target} />
          <List.Item.Detail.Metadata.Label title="Location" text={label} icon={getProbeFlagIcon(probe)} />
          <List.Item.Detail.Metadata.Label title="Network" text={formatDnsProviderName(formatProbeSubtitle(probe))} />
          <List.Item.Detail.Metadata.Separator />
          {failed ? (
            <>
              <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Failed", color: Color.Red }} />
              <List.Item.Detail.Metadata.Label title="Result" text={getDnsFailureMessage(result)} />
            </>
          ) : inProgress ? (
            <List.Item.Detail.Metadata.Label title="Status" text={{ value: "Running", color: Color.Yellow }} />
          ) : (
            <>
              <List.Item.Detail.Metadata.Label
                title="Query time"
                text={result.timings?.total != null ? `${result.timings.total} ms` : "—"}
              />
              <List.Item.Detail.Metadata.Label title="Answers" text={String(answers.length)} />
              {answers.length > 0 && <List.Item.Detail.Metadata.Separator />}
              {answers.map((answer: DnsAnswer, index: number) => (
                <List.Item.Detail.Metadata.Label
                  key={`${answer.type}-${answer.value}-${index}`}
                  title={answer.type}
                  text={formatDnsAnswerValue(answer.value)}
                />
              ))}
              {answers.length === 0 && <List.Item.Detail.Metadata.Label title="Result" text="No answers" />}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Main command

function Command(props: LaunchProps<{ arguments: Arguments.Dns }>) {
  const { token } = getAccessToken();

  return (
    <DnsCommand
      authToken={token}
      initialTarget={props.arguments.target ?? ""}
      initialFrom={props.arguments.from?.trim() || ""}
      initialType={props.arguments.type ?? ""}
    />
  );
}

/**
 * Main Raycast command for running Globalping DNS lookups.
 */
function DnsCommand({
  authToken,
  initialTarget = "",
  initialFrom = "",
  initialType = "",
}: {
  authToken: string;
  initialTarget?: string;
  initialFrom?: string;
  initialType?: string;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [from, setFrom] = useState(initialFrom);
  const [queryType, setQueryType] = useState<SupportedDnsQueryType>(normalizeDnsQueryType(initialType));
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedDnsRequest | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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
    void handleRun(initialTarget, initialFrom || preferredLocation || "world", normalizeDnsQueryType(initialType));
  }, [initialTarget, initialFrom, initialType, preferredLocation, isLocationsLoading]);

  // Run test

  async function handleRun(t: string, f: string, qt: SupportedDnsQueryType) {
    const trimmedTarget = t.trim();

    if (!trimmedTarget) {
      await showToast({ style: Toast.Style.Failure, title: "Target is required" });
      return;
    }

    setSubmittedRequest({ target: trimmedTarget, from: f, queryType: qt });
    await runTest(
      {
        type: MeasurementType.DNS,
        target: trimmedTarget,
        locations: [{ magic: f }],
        limit: defaultProbeLimit,
        measurementOptions: { query: { type: qt } },
      },
      `Resolving ${qt} ${trimmedTarget}…`,
    );
  }

  async function applyQueryType(nextQueryType: SupportedDnsQueryType) {
    setQueryType(nextQueryType);
    if (target.trim()) {
      await handleRun(target, selectedFrom, nextQueryType);
    }
  }

  // Actions

  function buildActions(probeResult?: ProbeResult) {
    const requestTarget = submittedRequest?.target ?? target;
    const requestFrom = submittedRequest?.from ?? selectedFrom;
    const requestQueryType = submittedRequest?.queryType ?? queryType;
    const finishedResults = measurement?.results.filter((r) => (r.result as DnsResult).status !== "in-progress") ?? [];
    const selectedResult = probeResult?.result as DnsResult | undefined;
    const selectedAnswers = selectedResult?.answers ?? [];

    const markdownTable = measurement
      ? formatDnsResultsAsMarkdownTable(
          requestTarget,
          requestQueryType,
          finishedResults.map((r) => ({ probe: r.probe, answers: (r.result as DnsResult).answers })),
        )
      : "";

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Run Test"
            icon={Icon.Play}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => handleRun(target, selectedFrom, queryType)}
          />
          <EditLocationAction
            authToken={authToken}
            currentValue={selectedFrom}
            recentLocations={recentLocations}
            onSelect={setFrom}
          />
          {selectedAnswers.length > 0 && (
            <Action.CopyToClipboard
              title={selectedAnswers.length === 1 ? "Copy Answer" : "Copy Answers"}
              content={formatDnsAnswersForClipboard(selectedAnswers)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="DNS Types">
          <Action
            title="Select A-Type Record"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "a" },
              Windows: { modifiers: ["ctrl", "shift"], key: "a" },
            }}
            onAction={() => applyQueryType(DnsQueryType.A)}
          />
          <Action
            title="Select AAAA Record"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "4" },
              Windows: { modifiers: ["ctrl", "shift"], key: "4" },
            }}
            onAction={() => applyQueryType(DnsQueryType.AAAA)}
          />
          <Action
            title="Select TXT Record"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "x" },
              Windows: { modifiers: ["ctrl", "shift"], key: "x" },
            }}
            onAction={() => applyQueryType(DnsQueryType.TXT)}
          />
          <Action
            title="Select MX Record"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "m" },
              Windows: { modifiers: ["ctrl", "shift"], key: "m" },
            }}
            onAction={() => applyQueryType(DnsQueryType.MX)}
          />
          <Action
            title="Select NS Record"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "n" },
              Windows: { modifiers: ["ctrl", "shift"], key: "n" },
            }}
            onAction={() => applyQueryType(DnsQueryType.NS)}
          />
          <Action
            title="Select CNAME Record"
            icon={Icon.TextCursor}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
            onAction={() => applyQueryType(DnsQueryType.CNAME)}
          />
        </ActionPanel.Section>
        {measurement && (
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Results as Markdown" content={markdownTable} />
            <Action.CopyToClipboard title="Copy Share Link" content={getShareUrl(measurement.id)} />
            <Action.CreateQuicklink
              title="Create Raycast Quicklink"
              icon={Icon.Star}
              quicklink={createDnsQuicklink(requestTarget, requestFrom, requestQueryType)}
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
  const selectedProbeResult =
    selectedItemId === null
      ? measurement?.results[0]
      : selectedItemId.startsWith("pending-")
        ? undefined
        : (measurement?.results.find((_, index) => resultKeys[index] === selectedItemId) ?? measurement?.results[0]);
  const actions = buildActions(selectedProbeResult);
  const detailTarget = submittedRequest?.target ?? target;

  return (
    <List
      navigationTitle={`DNS from ${selectedFrom}`}
      isShowingDetail={hasResults}
      isLoading={isRunning}
      searchBarPlaceholder="Hostname (e.g. google.com)"
      searchText={target}
      onSearchTextChange={setTarget}
      onSelectionChange={(id) => {
        if (hasMountedRef.current) setSelectedItemId(id);
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="DNS Record Type"
          value={queryType}
          onChange={(value) => {
            if (!hasMountedRef.current || value === queryType) return;
            void applyQueryType(value as SupportedDnsQueryType);
          }}
        >
          {SUPPORTED_DNS_QUERY_TYPES.map((supportedType) => (
            <List.Dropdown.Item key={supportedType} title={supportedType} value={supportedType} />
          ))}
        </List.Dropdown>
      }
      actions={actions}
    >
      {isRunning && currentCount === 0 && <List.EmptyView title="Contacting probes…" icon={Icon.Clock} />}
      {!hasResults && (
        <List.EmptyView
          title={target ? getRefreshActionHint(`resolve ${target}`) : "Enter a hostname to get started"}
          description={getCurrentLocationHint(selectedFrom)}
          icon={Icon.Network}
        />
      )}

      {measurement?.results.map((probeResult, index) => {
        const result = probeResult.result as DnsResult;
        const label = formatDnsProviderName(formatProbeListTitle(probeResult.probe));
        const isFinished = result.status !== "in-progress";
        const failed = isDnsFailed(result);
        const answers = result.answers ?? [];
        const firstAnswer = answers[0];
        const allValues = answers.map((a) => `${a.type} ${a.value}`).join("\n");

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
                        tooltip: getDnsFailureMessage(result),
                      },
                    ]
                  : firstAnswer
                    ? [
                        {
                          tag: { value: firstAnswer.type, color: getDnsTypeColor(firstAnswer.type) },
                          tooltip: allValues,
                        },
                      ]
                    : [{ text: "No answers" }]
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
