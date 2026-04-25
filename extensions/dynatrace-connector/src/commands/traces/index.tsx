import { List, Icon, Color, useNavigation, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import EmptyTenantState from "../../components/EmptyTenantState";
import { getActiveTenantOrMock } from "../../lib/mockTenant";
import { useDynatraceQuery } from "../../lib/query";
import { getActiveTenant } from "../../lib/tenants";
import { buildSpansQuery, formatDuration, Span } from "../../lib/types/span";
import { TraceDetail } from "./trace-detail";
import { FilterAccessory } from "./filter-accessory";
import type { TenantConfig } from "../../lib/auth";
import SearchLogsView from "../search-logs/index";

type StatusFilter = "ALL" | "OK" | "ERROR";
type DurationFilter = "any" | "100ms" | "500ms" | "1s" | "5s";

export default function SearchTraces() {
  const { push } = useNavigation();
  const [serviceName, setServiceName] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any");
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [debouncedServiceName, setDebouncedServiceName] = useState(serviceName);

  const { data, isLoading, error, execute } = useDynatraceQuery<Span>();

  // Load active tenant on mount
  useEffect(() => {
    getActiveTenantOrMock(() => getActiveTenant()).then((activeTenant) => {
      setTenant(activeTenant);
      setTenantChecked(true);
      setFiltersLoaded(true);
    });
  }, []);

  // Debounce service name input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedServiceName(serviceName), 400);
    return () => clearTimeout(timer);
  }, [serviceName]);

  // Execute query when filters change
  useEffect(() => {
    if (!filtersLoaded || !tenant) return;

    // Parse duration filter to milliseconds
    const minDurationMs =
      durationFilter === "any"
        ? 0
        : durationFilter === "100ms"
          ? 100
          : durationFilter === "500ms"
            ? 500
            : durationFilter === "1s"
              ? 1000
              : durationFilter === "5s"
                ? 5000
                : 0;

    const dqlQuery = buildSpansQuery({
      serviceName: debouncedServiceName || undefined,
      statusCode: statusFilter,
      minDurationMs,
    });

    execute(dqlQuery, undefined, tenant);
  }, [debouncedServiceName, statusFilter, durationFilter, filtersLoaded, tenant, execute]);

  const spans = data?.records ?? [];

  if (tenantChecked && !tenant) {
    return (
      <List isLoading={false}>
        <EmptyTenantState />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by service name..."
      onSearchTextChange={setServiceName}
      searchBarAccessory={
        <FilterAccessory
          tenant={tenant}
          statusFilter={statusFilter}
          durationFilter={durationFilter}
          onStatusChange={setStatusFilter}
          onDurationChange={setDurationFilter}
        />
      }
    >
      {error && !isLoading && spans.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Traces"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  if (!tenant) return;
                  const minDurationMs =
                    durationFilter === "any"
                      ? 0
                      : durationFilter === "100ms"
                        ? 100
                        : durationFilter === "500ms"
                          ? 500
                          : durationFilter === "1s"
                            ? 1000
                            : 5000;
                  const dqlQuery = buildSpansQuery({
                    serviceName: debouncedServiceName || undefined,
                    statusCode: statusFilter,
                    minDurationMs,
                  });
                  execute(dqlQuery, undefined, tenant);
                }}
              />
            </ActionPanel>
          }
        />
      )}

      {!isLoading && !error && spans.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Traces Found"
          description="Try adjusting your filters or service name"
        />
      )}

      {spans.map((span) => (
        <List.Item
          key={span.span_id}
          title={span["span.name"]}
          subtitle={span["service.name"]}
          icon={
            span.status_code === "ERROR"
              ? { source: Icon.XMarkCircle, tintColor: Color.Red }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          accessories={[
            {
              text: formatDuration(span["span.duration.us"]),
              tooltip: "Span duration",
            },
            {
              tag: {
                value: span.status_code,
                color:
                  span.status_code === "ERROR" ? Color.Red : span.status_code === "OK" ? Color.Green : Color.Yellow,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show Details"
                icon={Icon.Eye}
                onAction={() => push(<TraceDetail span={span} tenant={tenant!} />)}
              />
              <Action.CopyToClipboard
                title="Copy Trace ID"
                content={span.trace_id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Span ID"
                content={span.span_id}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Find Related Logs"
                icon={Icon.Link}
                onAction={() =>
                  push(
                    <SearchLogsView
                      arguments={{
                        timeframeValue: "30",
                        timeframeUnit: "m",
                        query: "all",
                      }}
                      _extraFilter={`trace_id == "${span.trace_id}"`}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
