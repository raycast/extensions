import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard, Color, Clipboard } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { AuditEvent, AuditEventFilters } from "../types";
import { getEvents } from "../api";
import { AuditEventDetail } from "./audit-event-detail";

// --- Event type display mapping ---

interface EventTypeInfo {
  label: string;
  icon: Icon;
  color: Color;
}

const EVENT_TYPE_MAP: Record<string, EventTypeInfo> = {
  "version.activate": { label: "Version Activated", icon: Icon.Rocket, color: Color.Green },
  "version.create": { label: "Version Created", icon: Icon.Plus, color: Color.Blue },
  "version.clone": { label: "Version Cloned", icon: Icon.TwoArrowsClockwise, color: Color.Blue },
  "version.update": { label: "Version Updated", icon: Icon.Pencil, color: Color.Orange },
  "version.deactivate": { label: "Version Deactivated", icon: Icon.Stop, color: Color.Red },
  "version.lock": { label: "Version Locked", icon: Icon.Lock, color: Color.Orange },
  "service.create": { label: "Service Created", icon: Icon.Plus, color: Color.Green },
  "service.delete": { label: "Service Deleted", icon: Icon.Trash, color: Color.Red },
  "service.update": { label: "Service Updated", icon: Icon.Pencil, color: Color.Orange },
  "domain.create": { label: "Domain Added", icon: Icon.Globe, color: Color.Green },
  "domain.delete": { label: "Domain Removed", icon: Icon.Globe, color: Color.Red },
  "domain.update": { label: "Domain Updated", icon: Icon.Globe, color: Color.Orange },
  "backend.create": { label: "Backend Added", icon: Icon.HardDrive, color: Color.Green },
  "backend.delete": { label: "Backend Removed", icon: Icon.HardDrive, color: Color.Red },
  "backend.update": { label: "Backend Updated", icon: Icon.HardDrive, color: Color.Orange },
  "purge.purge_all": { label: "Purge All", icon: Icon.XMarkCircle, color: Color.Red },
  "purge.purge_url": { label: "Purge URL", icon: Icon.XMarkCircle, color: Color.Orange },
  "purge.purge_by_key": { label: "Purge by Key", icon: Icon.XMarkCircle, color: Color.Orange },
  "acl.create": { label: "ACL Created", icon: Icon.Shield, color: Color.Green },
  "acl.delete": { label: "ACL Deleted", icon: Icon.Shield, color: Color.Red },
  "acl.update": { label: "ACL Updated", icon: Icon.Shield, color: Color.Orange },
  "acl_entry.create": { label: "ACL Entry Added", icon: Icon.Shield, color: Color.Green },
  "acl_entry.delete": { label: "ACL Entry Removed", icon: Icon.Shield, color: Color.Red },
  "acl_entry.update": { label: "ACL Entry Updated", icon: Icon.Shield, color: Color.Orange },
  "user.create": { label: "User Added", icon: Icon.Person, color: Color.Green },
  "user.delete": { label: "User Removed", icon: Icon.Person, color: Color.Red },
  "user.update": { label: "User Updated", icon: Icon.Person, color: Color.Orange },
  "token.create": { label: "Token Created", icon: Icon.Key, color: Color.Green },
  "token.destroy": { label: "Token Destroyed", icon: Icon.Key, color: Color.Red },
  "vcl.create": { label: "VCL Created", icon: Icon.Code, color: Color.Green },
  "vcl.delete": { label: "VCL Deleted", icon: Icon.Code, color: Color.Red },
  "vcl.update": { label: "VCL Updated", icon: Icon.Code, color: Color.Orange },
  "tls.create": { label: "TLS Created", icon: Icon.Lock, color: Color.Green },
  "tls.delete": { label: "TLS Deleted", icon: Icon.Lock, color: Color.Red },
  "tls.update": { label: "TLS Updated", icon: Icon.Lock, color: Color.Orange },
  "waf.create": { label: "WAF Created", icon: Icon.Shield, color: Color.Green },
  "waf.delete": { label: "WAF Deleted", icon: Icon.Shield, color: Color.Red },
  "waf.update": { label: "WAF Updated", icon: Icon.Shield, color: Color.Orange },
  "config_store.create": { label: "Config Store Created", icon: Icon.Gear, color: Color.Green },
  "config_store.delete": { label: "Config Store Deleted", icon: Icon.Gear, color: Color.Red },
  "config_store.update": { label: "Config Store Updated", icon: Icon.Gear, color: Color.Orange },
  "secret_store.create": { label: "Secret Store Created", icon: Icon.Lock, color: Color.Green },
  "secret_store.delete": { label: "Secret Store Deleted", icon: Icon.Lock, color: Color.Red },
  "kv_store.create": { label: "KV Store Created", icon: Icon.List, color: Color.Green },
  "kv_store.delete": { label: "KV Store Deleted", icon: Icon.List, color: Color.Red },
};

export function getEventTypeInfo(eventType: string): EventTypeInfo {
  if (EVENT_TYPE_MAP[eventType]) {
    return EVENT_TYPE_MAP[eventType];
  }

  // Fallback based on action suffix
  if (eventType.endsWith(".create")) {
    return { label: eventType, icon: Icon.Plus, color: Color.Green };
  }
  if (eventType.endsWith(".delete") || eventType.endsWith(".destroy")) {
    return { label: eventType, icon: Icon.Trash, color: Color.Red };
  }
  if (eventType.endsWith(".update")) {
    return { label: eventType, icon: Icon.Pencil, color: Color.Orange };
  }

  return { label: eventType, icon: Icon.Dot, color: Color.SecondaryText };
}

// --- Time range presets ---

type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";

interface TimeRangeOption {
  label: string;
  value: TimeRange;
}

const TIME_RANGES: TimeRangeOption[] = [
  { label: "Last Hour", value: "1h" },
  { label: "Last 24 Hours", value: "24h" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

function getTimeRangeStart(range: TimeRange): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  const ms: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - ms[range]).toISOString();
}

// --- Relative time formatting ---

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// --- Obfuscation helpers ---

function obfuscateToken(tokenId: string | undefined): string {
  if (!tokenId) return "N/A";
  if (tokenId.length <= 8) return "****";
  return `${tokenId.slice(0, 4)}...${tokenId.slice(-4)}`;
}

// --- Security event detection ---

const SECURITY_EVENT_TYPES = new Set([
  "token.create",
  "token.destroy",
  "user.create",
  "user.delete",
  "user.update",
  "acl.create",
  "acl.delete",
  "acl.update",
  "acl_entry.create",
  "acl_entry.delete",
  "acl_entry.update",
  "waf.create",
  "waf.delete",
  "waf.update",
  "tls.create",
  "tls.delete",
  "tls.update",
]);

function isSecurityEvent(eventType: string): boolean {
  return SECURITY_EVENT_TYPES.has(eventType);
}

// --- Main component ---

const PAGE_SIZE = 20;

export function AuditEventList() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const filtersRef = useRef<AuditEventFilters>({});

  const loadEvents = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const createdStart = getTimeRangeStart(timeRange);
        const filters: AuditEventFilters = {
          ...filtersRef.current,
          created_at_start: createdStart,
          page,
          per_page: PAGE_SIZE,
        };

        const response = await getEvents(filters);
        setEvents(response.data || []);
        setCurrentPage(response.meta?.current_page || 1);
        setTotalPages(response.meta?.total_pages || 1);
        setTotalCount(response.meta?.record_count || 0);
      } catch (error) {
        console.error("Error loading audit events:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load audit events",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [timeRange],
  );

  useEffect(() => {
    loadEvents(1);
  }, [loadEvents]);

  function handleTimeRangeChange(value: string) {
    setTimeRange(value as TimeRange);
  }

  async function handleNextPage() {
    if (currentPage < totalPages) {
      await loadEvents(currentPage + 1);
    }
  }

  async function handlePrevPage() {
    if (currentPage > 1) {
      await loadEvents(currentPage - 1);
    }
  }

  async function handleFilterByUser(userId: string) {
    filtersRef.current = { ...filtersRef.current, user_id: userId };
    await loadEvents(1);
    await showToast({ style: Toast.Style.Success, title: "Filtered by user" });
  }

  async function handleFilterByEventType(eventType: string) {
    filtersRef.current = { ...filtersRef.current, event_type: eventType };
    await loadEvents(1);
    await showToast({ style: Toast.Style.Success, title: `Filtered by: ${eventType}` });
  }

  async function handleFilterByService(serviceId: string) {
    filtersRef.current = { ...filtersRef.current, service_id: serviceId };
    await loadEvents(1);
    await showToast({ style: Toast.Style.Success, title: "Filtered by service" });
  }

  async function handleClearFilters() {
    filtersRef.current = {};
    await loadEvents(1);
    await showToast({ style: Toast.Style.Success, title: "Filters cleared" });
  }

  async function handleExportJSON() {
    try {
      const exported = events.map((e) => ({
        id: e.id,
        event_type: e.attributes.event_type,
        description: e.attributes.description,
        created_at: e.attributes.created_at,
        user_id: e.attributes.user_id || null,
        service_id: e.attributes.service_id || null,
        ip: e.attributes.ip,
        token_id: obfuscateToken(e.attributes.token_id),
      }));
      const json = JSON.stringify(exported, null, 2);
      await Clipboard.copy(json);
      await showToast({
        style: Toast.Style.Success,
        title: "Events exported",
        message: `${exported.length} events copied as JSON`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to export events",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleExportCSV() {
    try {
      const lines = ["id,event_type,description,created_at,user_id,service_id,ip"];
      for (const e of events) {
        const desc = e.attributes.description.replace(/"/g, '""');
        lines.push(
          `"${e.id}","${e.attributes.event_type}","${desc}","${e.attributes.created_at}","${e.attributes.user_id || ""}","${e.attributes.service_id || ""}","${e.attributes.ip}"`,
        );
      }
      await Clipboard.copy(lines.join("\n"));
      await showToast({
        style: Toast.Style.Success,
        title: "Events exported",
        message: `${events.length} events copied as CSV`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to export events",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const hasActiveFilters = Boolean(
    filtersRef.current.event_type || filtersRef.current.user_id || filtersRef.current.service_id,
  );

  const pageInfo =
    totalPages > 1 ? `Page ${currentPage} of ${totalPages} (${totalCount} total)` : `${totalCount} events`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search audit events..."
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" onChange={handleTimeRangeChange} defaultValue={timeRange}>
          {TIME_RANGES.map((range) => (
            <List.Dropdown.Item key={range.value} title={range.label} value={range.value} />
          ))}
        </List.Dropdown>
      }
    >
      {events.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Audit Events Found"
          description={
            hasActiveFilters
              ? "No events match your current filters. Try clearing filters or expanding the time range."
              : "No audit events found for the selected time range."
          }
          icon={Icon.Eye}
        />
      ) : (
        <List.Section title="Audit Events" subtitle={pageInfo}>
          {events.map((event) => {
            const info = getEventTypeInfo(event.attributes.event_type);
            const isSecurity = isSecurityEvent(event.attributes.event_type);
            const relativeTime = formatRelativeTime(event.attributes.created_at);
            const description = event.attributes.description || event.attributes.event_type;
            const truncatedDesc = description.length > 80 ? `${description.slice(0, 77)}...` : description;

            return (
              <List.Item
                key={event.id}
                title={truncatedDesc}
                subtitle={info.label}
                icon={{ source: info.icon, tintColor: info.color }}
                keywords={[
                  event.attributes.event_type,
                  event.attributes.description,
                  event.attributes.user_id || "",
                  event.attributes.service_id || "",
                  event.attributes.ip,
                  event.id,
                ]}
                accessories={[
                  ...(isSecurity ? [{ tag: { value: "Security", color: Color.Red } }] : []),
                  ...(event.attributes.service_id ? [{ tag: { value: "Service", color: Color.Blue } }] : []),
                  { text: relativeTime, tooltip: new Date(event.attributes.created_at).toLocaleString() },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="View Event Details"
                        target={<AuditEventDetail event={event} />}
                        icon={Icon.Eye}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Filter">
                      <Action
                        title="Filter by This Event Type"
                        icon={Icon.Filter}
                        onAction={() => handleFilterByEventType(event.attributes.event_type)}
                        shortcut={{
                          macOS: { modifiers: ["cmd"], key: "f" },
                          Windows: { modifiers: ["ctrl"], key: "f" },
                        }}
                      />
                      {event.attributes.user_id && (
                        <Action
                          title="Filter by This User"
                          icon={Icon.Person}
                          onAction={() => handleFilterByUser(event.attributes.user_id!)}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "u" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "u" },
                          }}
                        />
                      )}
                      {event.attributes.service_id && (
                        <Action
                          title="Filter by This Service"
                          icon={Icon.Globe}
                          onAction={() => handleFilterByService(event.attributes.service_id!)}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "s" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                          }}
                        />
                      )}
                      {hasActiveFilters && (
                        <Action
                          title="Clear All Filters"
                          icon={Icon.XMarkCircle}
                          onAction={handleClearFilters}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "x" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "x" },
                          }}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Event ID"
                        content={event.id}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "c" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                        }}
                      />
                      <Action.CopyToClipboard title="Copy Description" content={description} />
                      <Action.CopyToClipboard
                        title="Copy as JSON"
                        content={JSON.stringify(
                          {
                            id: event.id,
                            ...event.attributes,
                            token_id: obfuscateToken(event.attributes.token_id),
                          },
                          null,
                          2,
                        )}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Export">
                      <Action
                        title="Export Page as JSON"
                        icon={Icon.Download}
                        onAction={handleExportJSON}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "e" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                        }}
                      />
                      <Action title="Export Page as CSV" icon={Icon.Download} onAction={handleExportCSV} />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Navigate">
                      {currentPage < totalPages && (
                        <Action
                          title="Next Page"
                          icon={Icon.ArrowRight}
                          onAction={handleNextPage}
                          shortcut={{
                            macOS: { modifiers: ["cmd"], key: "." },
                            Windows: { modifiers: ["ctrl"], key: "." },
                          }}
                        />
                      )}
                      {currentPage > 1 && (
                        <Action
                          title="Previous Page"
                          icon={Icon.ArrowLeft}
                          onAction={handlePrevPage}
                          shortcut={{
                            macOS: { modifiers: ["cmd"], key: "," },
                            Windows: { modifiers: ["ctrl"], key: "," },
                          }}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Quick Access">
                      <Action
                        title="Refresh Events"
                        icon={Icon.ArrowClockwise}
                        onAction={() => loadEvents(currentPage)}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
