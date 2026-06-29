import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { searchServices, Service, ServiceStatus } from "./api";
import { useT } from "./i18n";
import ServiceDetailView from "./service-detail";
import { HistoryItem, useSearchHistory } from "./use-search-history";

export default function SearchServiceCommand() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistory();

  function handleSearchChange(text: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(text), 800);
  }

  function retry() {
    setRetryCount((n) => n + 1);
  }

  const { data, isLoading, error } = usePromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (q: string, _r: number) => {
      if (q.length < 2) return [];
      return await searchServices(q);
    },
    [query, retryCount],
    {
      onError(err) {
        showToast({
          style: Toast.Style.Failure,
          title: t.searchError,
          message: err.message,
          primaryAction: { title: t.actionRetry, onAction: retry },
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
      searchBarPlaceholder={t.searchPlaceholder}
      throttle
    >
      {/* Empty state: no history, no query */}
      {!error && query.length < 2 && history.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t.searchTitle}
          description={t.searchDescription}
        />
      )}

      {/* Error state */}
      {error && (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={t.errorLoadFailed}
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title={t.actionRetry}
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={retry}
              />
              <Action
                title={t.actionOpenPrefs}
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
          title={t.searchNoResults(query)}
        />
      )}

      {/* History section (shown when query is empty) */}
      {showingHistory && (
        <List.Section title={t.historySection}>
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
        <List.Section title={query.length >= 2 ? undefined : t.historySection}>
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
  const t = useT();
  const { icon, tintColor, label } = statusConfig(item.status, t);
  const service: Service = item;

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
              title={t.actionViewDetail}
              icon={Icon.Info}
              target={<ServiceDetailView slug={item.slug} name={item.name} />}
              onPush={() => onOpen(service)}
            />
            <Action.OpenInBrowser title={t.actionOpenBrowser} url={item.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t.actionRemoveFromHistory}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={onRemove}
            />
            <Action
              title={t.actionClearHistory}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
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
  const t = useT();
  const { icon, tintColor, label } = statusConfig(service.status, t);

  return (
    <List.Item
      icon={{ source: icon, tintColor }}
      title={service.name}
      subtitle={label}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title={t.actionViewDetail}
              icon={Icon.Info}
              target={
                <ServiceDetailView slug={service.slug} name={service.name} />
              }
              onPush={() => onOpen(service)}
            />
            <Action.OpenInBrowser
              title={t.actionOpenBrowser}
              url={service.url}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function statusConfig(
  status: ServiceStatus,
  t: ReturnType<typeof useT>,
): { icon: Icon; tintColor: Color; label: string } {
  switch (status) {
    case "ok":
      return {
        icon: Icon.CheckCircle,
        tintColor: Color.Green,
        label: t.statusNormal,
      };
    case "warning":
      return {
        icon: Icon.ExclamationMark,
        tintColor: Color.Orange,
        label: t.statusWarning,
      };
    case "danger":
      return {
        icon: Icon.XMarkCircle,
        tintColor: Color.Red,
        label: t.statusDanger,
      };
    default:
      return {
        icon: Icon.QuestionMark,
        tintColor: Color.SecondaryText,
        label: t.statusUnknown,
      };
  }
}
