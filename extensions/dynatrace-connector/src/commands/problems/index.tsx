import { List, ActionPanel, Action, Icon, Color, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useDynatraceQuery } from "../../lib/query";
import { Problem, buildProblemsQuery } from "../../lib/types/problem";
import { getActiveTenant, setActiveTenant, listTenants } from "../../lib/tenants";
import TenantSwitcher from "../../components/TenantSwitcher";
import EmptyTenantState from "../../components/EmptyTenantState";
import { getActiveTenantOrMock } from "../../lib/mockTenant";
import type { TenantConfig } from "../../lib/auth";
import ProblemDetailView from "./problem-detail";
import { toJson, toCsv } from "../../lib/utils/exportData";

const SEVERITY_ICONS: Record<string, Icon> = {
  AVAILABILITY: Icon.XMarkCircle,
  ERROR: Icon.Xmark,
  PERFORMANCE: Icon.Gauge,
  RESOURCE_CONTENTION: Icon.HardDrive,
  CUSTOM_ALERT: Icon.Bell,
};

const SEVERITY_COLORS: Record<string, Color> = {
  AVAILABILITY: Color.Red,
  ERROR: Color.Orange,
  PERFORMANCE: Color.Yellow,
  RESOURCE_CONTENTION: Color.Blue,
  CUSTOM_ALERT: Color.Purple,
};

function getIcon(severity: string): Icon {
  return SEVERITY_ICONS[severity] ?? Icon.Circle;
}

function getColor(severity: string): Color {
  return SEVERITY_COLORS[severity] ?? Color.SecondaryText;
}

function formatDuration(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const durationMs = end - start;

  const durationMin = Math.floor(durationMs / 60_000);
  if (durationMin < 60) return `${durationMin} min`;

  const durationH = Math.floor(durationMin / 60);
  if (durationH < 24) return `${durationH} hours`;

  return `${Math.floor(durationH / 24)} days`;
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function ProblemsCommand() {
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "ALL">("OPEN");
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [allTenants, setAllTenants] = useState<TenantConfig[]>([]);

  const { data, isLoading, error, execute } = useDynatraceQuery<Problem>();

  // Load active tenant and all tenants once on mount
  useEffect(() => {
    Promise.all([getActiveTenantOrMock(() => getActiveTenant()), listTenants()]).then(([activeTenant, tenants]) => {
      setTenant(activeTenant);
      setAllTenants(tenants);
      setTenantChecked(true);
      setFiltersLoaded(true);
    });
  }, []);

  // Execute query when filters are loaded
  useEffect(() => {
    if (!filtersLoaded || !tenant) return;

    const dql = buildProblemsQuery(statusFilter);
    execute(dql, undefined, tenant);
  }, [statusFilter, filtersLoaded, tenant, execute]);

  const handleTenantChange = async (id: string) => {
    await setActiveTenant(id);
    const all = await import("../../lib/tenants").then((m) => m.listTenants());
    const next = all.find((t) => t.id === id) ?? null;
    setTenant(next);
  };

  const handleExportJson = async () => {
    try {
      const json = toJson(problems);
      await Clipboard.copy(json);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported",
        message: `${problems.length} problems exported to clipboard as JSON`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = toCsv(
        problems.map((p) => ({
          id: p["event.id"],
          name: p["event.name"],
          severity: p["event.severity"],
          status: p["event.status"],
          start: p["event.start"],
          entities: p.affected_entity_ids?.join("; ") || "",
          duration: formatDuration(p["event.start"], p["event.end"]),
        })),
      );
      await Clipboard.copy(csv);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported",
        message: `${problems.length} problems exported to clipboard as CSV`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const problems = data?.records ?? [];
  // Server-side sorting is handled by buildProblemsQuery (sort event.severity asc, event.start desc)

  if (tenantChecked && !tenant) {
    return (
      <List isLoading={false}>
        <EmptyTenantState />
      </List>
    );
  }

  if (!isLoading && !error && problems.length === 0) {
    return (
      <List
        isLoading={false}
        searchBarAccessory={tenant ? <TenantSwitcher value={tenant.id} onChange={handleTenantChange} /> : undefined}
      >
        <List.EmptyView icon={Icon.Star} title="All systems operational 🎉" description="No open problems" />
      </List>
    );
  }

  if (error && !isLoading && problems.length === 0) {
    return (
      <List
        isLoading={false}
        searchBarAccessory={tenant ? <TenantSwitcher value={tenant.id} onChange={handleTenantChange} /> : undefined}
      >
        <List.EmptyView
          icon={Icon.Warning}
          title="Query Failed"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  if (!tenant) return;
                  const dql = buildProblemsQuery(statusFilter);
                  execute(dql, undefined, tenant);
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as "OPEN" | "ALL")}
        >
          <List.Dropdown.Item title="Open Problems" value="OPEN" />
          <List.Dropdown.Item title="All Problems" value="ALL" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          {allTenants.length > 0 && (
            <ActionPanel.Section title="Switch Tenant">
              {allTenants.map((t) => (
                <Action
                  key={t.id}
                  title={t.name}
                  icon={tenant?.id === t.id ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => handleTenantChange(t.id)}
                />
              ))}
            </ActionPanel.Section>
          )}
          {problems.length > 0 && (
            <ActionPanel.Section title="Export">
              <Action title="Copy All as JSON" icon={Icon.Clipboard} onAction={handleExportJson} />
              <Action title="Copy All as CSV" icon={Icon.Clipboard} onAction={handleExportCsv} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      {problems.map((problem) => (
        <List.Item
          key={problem["event.id"]}
          icon={getIcon(problem["event.severity"])}
          title={problem["event.name"]}
          subtitle={
            problem.affected_entity_ids && problem.affected_entity_ids.length > 0
              ? problem.affected_entity_ids.slice(0, 2).join(", ") +
                (problem.affected_entity_ids.length > 2 ? ` +${problem.affected_entity_ids.length - 2} more` : "")
              : "No affected entities"
          }
          accessories={[
            {
              tag: {
                value: problem["event.severity"],
                color: getColor(problem["event.severity"]),
              },
            },
            {
              text: formatDuration(problem["event.start"], problem["event.end"]),
            },
            {
              text: formatTimeAgo(problem["event.start"]),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ProblemDetailView problem={problem} tenant={tenant!} />} />
              <Action.CopyToClipboard content={problem["event.id"]} title="Copy Problem ID" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
