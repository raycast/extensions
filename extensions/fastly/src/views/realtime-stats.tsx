import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { FastlyService, RealtimeEntry } from "../types";
import { getRealtimeStats, getServiceDomains } from "../api";

interface RealtimeStatsProps {
  service: FastlyService;
}

// Keep a rolling window of per-second entries for averages
const WINDOW_SECONDS = 60;
// Never poll faster than this, even when the API returns immediately
const MIN_POLL_MS = 1000;

interface Totals {
  requests: number;
  errors: number;
  status4xx: number;
  status5xx: number;
  bandwidth: number;
}

interface Snapshot {
  latest: Record<string, number>;
  window: RealtimeEntry[];
  totals: Totals;
  apiMessage?: string;
}

// Delivery and Compute report under different field names; sum both.
const FIELDS = {
  requests: ["requests", "compute_requests"],
  errors: ["errors"],
  status4xx: ["status_4xx", "compute_resp_status_4xx"],
  status5xx: ["status_5xx", "compute_resp_status_5xx"],
  bandwidth: ["resp_header_bytes", "resp_body_bytes", "compute_resp_header_bytes", "compute_resp_body_bytes"],
  hits: ["hits"],
  miss: ["miss"],
};

function fieldValue(aggregated: Record<string, number> | undefined, names: string[]): number {
  return names.reduce((total, name) => total + (aggregated?.[name] || 0), 0);
}

function sumField(entries: RealtimeEntry[], names: string[]): number {
  return entries.reduce((total, entry) => total + fieldValue(entry.aggregated, names), 0);
}

function formatCount(count: number): string {
  return Math.round(count).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function RealtimeStats({ service }: RealtimeStatsProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);
  const [heartbeat, setHeartbeat] = useState<{ polls: number; at: number }>({ polls: 0, at: 0 });
  const pausedRef = useRef(false);
  // The poll loop reads the ref; keep it in sync with the rendered state
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    getServiceDomains(service.id)
      .then((domains) => setDomain(domains[0] || null))
      .catch(() => setDomain(null));
  }, []);

  async function sendTestRequest() {
    if (!domain) return;
    const url = `https://${domain}/?raycast-rt-test=${Date.now()}`;
    try {
      const response = await fetch(url, { headers: { "cache-control": "no-cache" } });
      await showToast({
        style: Toast.Style.Success,
        title: `Test request sent (${response.status})`,
        message: "Watch for it here in ~10 seconds (stats lag slightly behind real time)",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Test request failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    // The flag must be scoped to this effect invocation: a ref would stay
    // tripped after a cleanup and permanently kill the loop when the effect
    // re-runs (hot reload, double-invoked effects).
    let stopped = false;
    // "h" seeds the window with up to 120s of buffered history, so the view
    // has data immediately; after that we long-poll from the last timestamp.
    let timestamp: number | "h" = "h";
    let polls = 0;
    const window: RealtimeEntry[] = [];
    const totals: Totals = { requests: 0, errors: 0, status4xx: 0, status5xx: 0, bandwidth: 0 };

    async function poll() {
      while (!stopped) {
        if (pausedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        const startedAt = Date.now();
        try {
          // The endpoint long-polls: it returns as soon as new per-second data exists
          const response = await getRealtimeStats(service.id, timestamp);
          if (stopped) return;
          // Paused while the long poll was in flight: drop the response without
          // advancing the timestamp so the data is re-fetched on resume
          if (pausedRef.current) {
            continue;
          }
          timestamp = response.Timestamp || timestamp;
          polls += 1;
          setHeartbeat({ polls, at: Date.now() });

          const entries = response.Data || [];
          if (entries.length > 0) {
            window.push(...entries);
            while (window.length > WINDOW_SECONDS) {
              window.shift();
            }
            totals.requests += sumField(entries, FIELDS.requests);
            totals.errors += sumField(entries, FIELDS.errors);
            totals.status4xx += sumField(entries, FIELDS.status4xx);
            totals.status5xx += sumField(entries, FIELDS.status5xx);
            totals.bandwidth += sumField(entries, FIELDS.bandwidth);
            setSnapshot({
              latest: entries[entries.length - 1].aggregated || {},
              window: [...window],
              totals: { ...totals },
            });
          } else {
            // No new traffic; zero out "now" so stale numbers don't linger,
            // and surface the API's own message (e.g. "No data available")
            setSnapshot((current) => ({
              latest: {},
              window: current?.window || [],
              totals: { ...totals },
              apiMessage: response.Error,
            }));
          }
          setIsLoading(false);
        } catch (error) {
          if (stopped) return;
          setIsLoading(false);
          await showToast({
            style: Toast.Style.Failure,
            title: "Real-time stats error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          // Back off before retrying so a persistent failure doesn't spam
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        // Pace the loop: an immediate empty response must not hot-loop the API
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_POLL_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_POLL_MS - elapsed));
        }
      }
    }

    poll();
    return () => {
      stopped = true;
    };
  }, []);

  const latest = snapshot?.latest || {};
  const window = snapshot?.window || [];
  const totals = snapshot?.totals || { requests: 0, errors: 0, status4xx: 0, status5xx: 0, bandwidth: 0 };
  const windowSeconds = Math.max(window.length, 1);
  const hasData = window.length > 0 || totals.requests > 0;

  const requestsNow = fieldValue(latest, FIELDS.requests);
  const avgRequests = sumField(window, FIELDS.requests) / windowSeconds;
  const hits = sumField(window, FIELDS.hits);
  const misses = sumField(window, FIELDS.miss);
  const hitRatio = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(1) : null;
  const errors = sumField(window, FIELDS.errors);
  const status5xx = sumField(window, FIELDS.status5xx);
  const status4xx = sumField(window, FIELDS.status4xx);
  const bandwidthPerSec = sumField(window, FIELDS.bandwidth) / windowSeconds;

  const status = paused
    ? "_Paused._"
    : !hasData
      ? `_Live and connected — no requests in the last couple of minutes.${snapshot?.apiMessage ? ` Fastly says: "${snapshot.apiMessage}".` : ""} Hit the service and the numbers tick within a second or two._`
      : "_Live — updating as requests arrive._";

  const markdown = `# Real-Time Stats — ${service.name}

${status}

| Metric | Now | Last ${windowSeconds}s | Session |
| --- | ---: | ---: | ---: |
| Requests | ${formatCount(requestsNow)} | ${avgRequests.toFixed(1)}/s avg | ${formatCount(totals.requests)} |
| Errors | ${formatCount(fieldValue(latest, FIELDS.errors))} | ${formatCount(errors)} | ${formatCount(totals.errors)} |
| 4xx responses | ${formatCount(fieldValue(latest, FIELDS.status4xx))} | ${formatCount(status4xx)} | ${formatCount(totals.status4xx)} |
| 5xx responses | ${formatCount(fieldValue(latest, FIELDS.status5xx))} | ${formatCount(status5xx)} | ${formatCount(totals.status5xx)} |
| Bandwidth | — | ${formatBytes(bandwidthPerSec)}/s | ${formatBytes(totals.bandwidth)} |

_Session totals include everything seen since this view opened, plus up to two minutes of buffered history from just before. Polling runs only while this view stays open — switching away from Raycast pauses it._

_Connection: ${heartbeat.polls} ${heartbeat.polls === 1 ? "check" : "checks"} since opening${heartbeat.at ? `, last at ${new Date(heartbeat.at).toLocaleTimeString()}` : ""}._
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Real-Time — ${service.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Requests/sec" text={formatCount(requestsNow)} />
          {hitRatio !== null && <Detail.Metadata.Label title={`Hit Ratio (${windowSeconds}s)`} text={`${hitRatio}%`} />}
          <Detail.Metadata.Label title="Bandwidth/sec" text={`${formatBytes(bandwidthPerSec)}/s`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Session Requests" text={formatCount(totals.requests)} />
          <Detail.Metadata.Label title="Session Errors" text={formatCount(totals.errors)} />
          <Detail.Metadata.Label title="Session 5xx" text={formatCount(totals.status5xx)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={paused ? "Resume" : "Pause"}
            icon={paused ? Icon.Play : Icon.Pause}
            onAction={() => setPaused(!paused)}
          />
          {domain && (
            <Action
              title="Send Test Request"
              icon={Icon.Bolt}
              onAction={sendTestRequest}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "t" },
                Windows: { modifiers: ["ctrl"], key: "t" },
              }}
            />
          )}
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Open Real-time Dashboard"
            url={`https://manage.fastly.com/observability/dashboard/system/overview/realtime/${service.id}`}
          />
          <Action.CopyToClipboard title="Copy Service ID" content={service.id} />
        </ActionPanel>
      }
    />
  );
}
