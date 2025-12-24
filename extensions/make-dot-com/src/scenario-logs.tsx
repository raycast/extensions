import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import type { MakeClient } from "./make-api";
import { presentMakeApiError } from "./make-api";
import { toScenarioExecutionLogUrl } from "./make-browser-url";
import { ScenarioExecutionDetail } from "./scenario-execution-detail";
import type { ListScenarioLogsResponse, ScenarioLog } from "./types";

type Props = {
  client: MakeClient;
  baseUrl: string;
  teamId: number;
  scenarioId: number;
};

type StatusFilter = "all" | "success" | "warning" | "error";
type TimeFilter = "all" | "24h" | "7d" | "30d";

type CombinedFilterKey = `${StatusFilter}:${TimeFilter}`;

const PAGE_SIZE = 50;

function parseCombinedFilter(key: CombinedFilterKey): {
  status: StatusFilter;
  time: TimeFilter;
} {
  const [status, time] = key.split(":") as [StatusFilter, TimeFilter];
  return { status, time };
}

function timeToFromMs(time: TimeFilter): number | null {
  const now = Date.now();
  switch (time) {
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return null;
  }
}

function statusToApiStatus(status: StatusFilter): 1 | 2 | 3 | null {
  switch (status) {
    case "success":
      return 1;
    case "warning":
      return 2;
    case "error":
      return 3;
    case "all":
    default:
      return null;
  }
}

function statusLabel(status?: number): string {
  if (status === 1) return "Success";
  if (status === 2) return "Warning";
  if (status === 3) return "Error";
  return "—";
}

function statusIcon(status?: number): Icon {
  if (status === 1) return Icon.CheckCircle;
  if (status === 2) return Icon.ExclamationMark;
  if (status === 3) return Icon.XMarkCircle;
  return Icon.Circle;
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

function fmtDurationMs(ms?: number): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function normalizeLogType(type: string | undefined): string {
  return String(type ?? "")
    .trim()
    .toLowerCase();
}

function titleCaseWord(input: string): string {
  if (!input) return input;
  return input.slice(0, 1).toUpperCase() + input.slice(1);
}

function isAuditLogType(typeLower: string): boolean {
  // From observed Make scenario log types; audit events are not executable runs.
  // Example: "modify" indicates a scenario edit event.
  return (
    typeLower === "modify" ||
    typeLower === "create" ||
    typeLower === "delete" ||
    typeLower === "rename" ||
    typeLower === "move" ||
    typeLower === "clone" ||
    typeLower === "update"
  );
}

function iconForAuditType(typeLower: string): Icon {
  if (typeLower === "modify") return Icon.Pencil;
  if (typeLower === "create") return Icon.PlusCircle;
  if (typeLower === "delete") return Icon.Trash;
  return Icon.Pencil;
}

function ScenarioLogsFilterDropdown(props: {
  value: CombinedFilterKey;
  onChange: (next: CombinedFilterKey) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter executions"
      storeValue={true}
      value={props.value}
      onChange={(v) => props.onChange(v as CombinedFilterKey)}
    >
      <List.Dropdown.Section title="All">
        <List.Dropdown.Item title="All • All time" value="all:all" />
        <List.Dropdown.Item title="All • 24h" value="all:24h" />
        <List.Dropdown.Item title="All • 7d" value="all:7d" />
        <List.Dropdown.Item title="All • 30d" value="all:30d" />
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Success">
        <List.Dropdown.Item title="Success • All time" value="success:all" />
        <List.Dropdown.Item title="Success • 24h" value="success:24h" />
        <List.Dropdown.Item title="Success • 7d" value="success:7d" />
        <List.Dropdown.Item title="Success • 30d" value="success:30d" />
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Warning">
        <List.Dropdown.Item title="Warning • All time" value="warning:all" />
        <List.Dropdown.Item title="Warning • 24h" value="warning:24h" />
        <List.Dropdown.Item title="Warning • 7d" value="warning:7d" />
        <List.Dropdown.Item title="Warning • 30d" value="warning:30d" />
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Error">
        <List.Dropdown.Item title="Error • All time" value="error:all" />
        <List.Dropdown.Item title="Error • 24h" value="error:24h" />
        <List.Dropdown.Item title="Error • 7d" value="error:7d" />
        <List.Dropdown.Item title="Error • 30d" value="error:30d" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export function ScenarioLogs(props: Props) {
  const [filterKey, setFilterKey] = useState<CombinedFilterKey>("all:all");
  const filter = useMemo(() => parseCombinedFilter(filterKey), [filterKey]);

  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<ScenarioLog[]>([]);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(offset: number, mode: "replace" | "append") {
    setIsLoading(true);
    try {
      const fromMs = timeToFromMs(filter.time);
      const apiStatus = statusToApiStatus(filter.status);

      const res = await props.client.getJson<ListScenarioLogsResponse>(
        `/api/v2/scenarios/${props.scenarioId}/logs`,
        {
          showCheckRuns: true,
          ...(fromMs ? { from: fromMs } : null),
          ...(apiStatus ? { status: apiStatus } : null),
          "pg[limit]": PAGE_SIZE,
          "pg[offset]": offset,
          "pg[sortBy]": "imtId",
          "pg[sortDir]": "desc",
        },
      );

      const items = res.scenarioLogs ?? [];
      setLogs((prev) => (mode === "replace" ? items : [...prev, ...items]));
      setHasMore(items.length >= PAGE_SIZE);
    } catch (e) {
      await presentMakeApiError(e, "Failed to load executions");
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    void loadPage(0, "replace");
  }, [props.scenarioId, filterKey]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Executions — Scenario ${props.scenarioId}`}
      searchBarPlaceholder="Search executions…"
      searchBarAccessory={
        <ScenarioLogsFilterDropdown value={filterKey} onChange={setFilterKey} />
      }
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore,
        onLoadMore: () => void loadPage(logs.length, "append"),
      }}
    >
      {logs.map((log, idx) => {
        const typeLower = normalizeLogType(log.type);
        const isAuditEvent = isAuditLogType(typeLower);

        // Important: audit events can include an `id`, but it's not an execution id.
        const executionIdRaw = isAuditEvent
          ? null
          : (log.executionId ?? log.id);
        const executionId =
          executionIdRaw !== null && executionIdRaw !== undefined
            ? String(executionIdRaw)
            : null;

        const executionName =
          typeof log.executionName === "string" && log.executionName.trim()
            ? log.executionName.trim()
            : null;

        const key = String(
          log.imtId ?? executionId ?? `${log.timestamp ?? "unknown"}:${idx}`,
        );
        const title = isAuditEvent
          ? typeLower === "modify"
            ? "Edited"
            : titleCaseWord(typeLower)
          : (executionName ?? statusLabel(log.status));
        const url = executionId
          ? toScenarioExecutionLogUrl({
              baseUrl: props.baseUrl,
              teamId: props.teamId,
              scenarioId: props.scenarioId,
              executionId,
            })
          : null;

        const accessories: List.Item.Accessory[] = [];
        if (!isAuditEvent) {
          if (log.duration !== undefined)
            accessories.push({ text: fmtDurationMs(log.duration) });
          if (log.operations !== undefined)
            accessories.push({ text: String(log.operations) });
        }
        if (log.timestamp) accessories.push({ date: new Date(log.timestamp) });

        const authorName = log.detail?.author?.name?.trim() || null;
        const typeLabel = typeLower ? typeLower : null;

        return (
          <List.Item
            key={key}
            title={title}
            subtitle={
              log.timestamp
                ? isAuditEvent
                  ? [typeLabel, authorName, fmtDate(log.timestamp)]
                      .filter(Boolean)
                      .join(" • ")
                  : [typeLabel, fmtDate(log.timestamp)]
                      .filter(Boolean)
                      .join(" • ")
                : undefined
            }
            icon={
              isAuditEvent
                ? iconForAuditType(typeLower)
                : statusIcon(log.status)
            }
            keywords={[
              executionId ?? "",
              log.imtId ? String(log.imtId) : "",
              log.type ? String(log.type) : "",
              executionName ?? "",
              typeof log.status === "number" ? String(log.status) : "",
            ].filter(Boolean)}
            accessories={accessories}
            actions={
              <ActionPanel>
                {executionId ? (
                  <Action.Push
                    title="Show Execution Details"
                    target={
                      <ScenarioExecutionDetail
                        client={props.client}
                        baseUrl={props.baseUrl}
                        teamId={props.teamId}
                        scenarioId={props.scenarioId}
                        executionId={executionId}
                      />
                    }
                  />
                ) : null}

                {url ? (
                  <Action.OpenInBrowser
                    title="Open in Make.com"
                    url={url}
                    icon={Icon.Globe}
                  />
                ) : null}

                <ActionPanel.Section>
                  {executionId ? (
                    <Action.CopyToClipboard
                      title="Copy Execution Id"
                      content={executionId}
                    />
                  ) : null}
                  {url ? (
                    <Action.CopyToClipboard title="Copy URL" content={url} />
                  ) : null}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => void loadPage(0, "replace")}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
