import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  getLocale,
  getStatusUrl,
  searchServices,
  Service,
  ServiceStatus,
} from "./api";
import ServiceDetailView from "./service-detail";
import { HistoryItem, useSearchHistory } from "./use-search-history";

export default function SearchServiceCommand() {
  const [query, setQuery] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistory();
  const locale = getLocale();

  function handleSearchChange(text: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(text), 800);
  }

  function retry() {
    setRetryCount((n) => n + 1);
  }

  const { data, isLoading, error } = usePromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (q: string, _r: number, _locale: string) => {
      if (q.length < 2) return [];
      return await searchServices(q);
    },
    [query, retryCount, locale],
    {
      onError(err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load results",
          message: err.message,
          primaryAction: { title: "Retry", onAction: retry },
        });
      },
    },
  );

  const services: Service[] = data ?? [];
  const showingHistory = query.length < 2 && history.length > 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search for a service (e.g. GitHub, Netflix, OVH…)"
      throttle
    >
      {/* Empty state: no history, no query */}
      {!error && query.length < 2 && history.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search a Service"
          description="Type at least 2 characters to search on Downdetector"
        />
      )}

      {/* Error state */}
      {error && (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Load failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={retry}
              />
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {/* No results */}
      {!error && query.length >= 2 && !isLoading && services.length === 0 && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={`No results found for "${query}"`}
        />
      )}

      {/* History section (shown when query is empty) */}
      {showingHistory && (
        <List.Section title="Recent">
          {history.map((item) => (
            <HistoryListItem
              key={item.slug}
              item={item}
              onOpen={(service) => addToHistory(service)}
              onRemove={() => removeFromHistory(item.slug)}
              onClear={clearHistory}
            />
          ))}
        </List.Section>
      )}

      {/* Search results */}
      {services.length > 0 && (
        <List.Section title={query.length >= 2 ? undefined : "Recent"}>
          {services.map((service) => (
            <ServiceListItem
              key={service.slug}
              service={service}
              onOpen={(s) => addToHistory(s)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ─── History item ─────────────────────────────────────────────────────────────

function HistoryListItem({
  item,
  onOpen,
  onRemove,
  onClear,
}: {
  item: HistoryItem;
  onOpen: (s: Service) => void;
  onRemove: () => void;
  onClear: () => void;
}) {
  const { icon, tintColor, label } = statusConfig(item.status);
  // Recompute the URL from the slug so it always targets the current Region,
  // even if the entry was saved under a different Region.
  const service: Service = { ...item, url: getStatusUrl(item.slug) };

  return (
    <List.Item
      icon={{ source: icon, tintColor }}
      title={item.name}
      subtitle={label}
      accessories={[
        { icon: { source: Icon.Clock, tintColor: Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Info}
              target={<ServiceDetailView slug={item.slug} name={item.name} />}
              onPush={() => onOpen(service)}
            />
            <Action.OpenInBrowser
              title="Open on Downdetector"
              url={service.url}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={onRemove}
            />
            <Action
              title="Clear History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={onClear}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ─── Search result item ───────────────────────────────────────────────────────

function ServiceListItem({
  service,
  onOpen,
}: {
  service: Service;
  onOpen: (s: Service) => void;
}) {
  const { icon, tintColor, label } = statusConfig(service.status);

  return (
    <List.Item
      icon={{ source: icon, tintColor }}
      title={service.name}
      subtitle={label}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Info}
              target={
                <ServiceDetailView slug={service.slug} name={service.name} />
              }
              onPush={() => onOpen(service)}
            />
            <Action.OpenInBrowser
              title="Open on Downdetector"
              url={service.url}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function statusConfig(status: ServiceStatus): {
  icon: Icon;
  tintColor: Color;
  label: string;
} {
  switch (status) {
    case "ok":
      return {
        icon: Icon.CheckCircle,
        tintColor: Color.Green,
        label: "Normal operation",
      };
    case "warning":
      return {
        icon: Icon.ExclamationMark,
        tintColor: Color.Orange,
        label: "Issues reported",
      };
    case "danger":
      return {
        icon: Icon.XMarkCircle,
        tintColor: Color.Red,
        label: "Outage reported",
      };
    default:
      return {
        icon: Icon.QuestionMark,
        tintColor: Color.SecondaryText,
        label: "Unknown status",
      };
  }
}
