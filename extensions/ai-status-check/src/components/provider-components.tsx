import { Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { highestHealth } from "../domain/derive-health";
import { buildComponentSections } from "../domain/provider-view";
import { componentStatusPresentation, fallbackHealthLabel } from "../domain/status-presentation";
import type { ComponentHistory, ComponentStatus, ProviderStatusRecord } from "../domain/types";
import { useRefreshableProviderRecord, type RefreshProvider } from "../hooks/use-refreshable-provider-record";
import type { ProviderDefinition } from "../providers/types";
import { buildComponentHistoryMarkdown, formatUptimePercent } from "../utils/component-history-markdown";
import { ComponentActions, ComponentListActions, ProviderSourceActions } from "./provider-actions";
import { statusIcon } from "./status-icon";

export function ProviderComponents({
  provider,
  record,
  refreshProvider,
  onRefresh,
}: {
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  refreshProvider: RefreshProvider;
  onRefresh(): Promise<void>;
}) {
  const components = record.snapshot?.components ?? [];

  if (components.length === 0) return null;

  const health = highestHealth(components.map((component) => component.health));
  const affectedCount = components.filter(
    (component) => component.health !== "operational" && component.health !== "unknown",
  ).length;

  return (
    <List.Section title="Components">
      <List.Item
        id="provider-components"
        icon={statusIcon(health)}
        title="View Components"
        keywords={components.map((component) => component.name)}
        accessories={[
          { text: fallbackHealthLabel(health) },
          { text: componentCollectionMetadata(components.length, affectedCount) },
        ]}
        actions={
          <ComponentListActions
            provider={provider}
            target={<ComponentList provider={provider} record={record} refreshProvider={refreshProvider} />}
            onRefresh={onRefresh}
          />
        }
      />
    </List.Section>
  );
}

function ComponentList({
  provider,
  record,
  refreshProvider,
}: {
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  refreshProvider: RefreshProvider;
}) {
  const { record: currentRecord, refresh } = useRefreshableProviderRecord(provider.id, record, refreshProvider);
  const components = currentRecord.snapshot?.components ?? [];
  const sections = buildComponentSections(components);
  const firstComponent = sections.groups[0]?.components[0] ?? sections.ungrouped[0];
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() =>
    firstComponent ? componentItemId(firstComponent.id) : null,
  );

  return (
    <List
      isShowingDetail
      isLoading={currentRecord.refreshState === "refreshing"}
      navigationTitle={`${provider.name} Components`}
      searchBarPlaceholder={`Search ${provider.name} components`}
      onSelectionChange={setSelectedItemId}
    >
      {components.length > 0 ? (
        <>
          {sections.groups.map((group) => (
            <ComponentSection
              key={group.name}
              title={group.name}
              subtitle={componentCount(group.components.length)}
              components={group.components}
              provider={provider}
              onRefresh={refresh}
              fetchedAt={currentRecord.snapshot?.fetchedAt}
              selectedItemId={selectedItemId}
            />
          ))}
          {sections.ungrouped.length > 0 ? (
            <ComponentSection
              title={sections.groups.length > 0 ? "Other Components" : "Components"}
              subtitle={componentCount(sections.ungrouped.length)}
              components={sections.ungrouped}
              provider={provider}
              onRefresh={refresh}
              fetchedAt={currentRecord.snapshot?.fetchedAt}
              selectedItemId={selectedItemId}
            />
          ) : null}
        </>
      ) : (
        <List.EmptyView
          icon={Icon.MinusCircle}
          title="No Components"
          description={currentRecord.refreshError ?? "This provider no longer publishes component status."}
          actions={<ProviderSourceActions provider={provider} onRefresh={refresh} />}
        />
      )}
    </List>
  );
}

function ComponentSection({
  title,
  subtitle,
  components,
  provider,
  onRefresh,
  fetchedAt,
  selectedItemId,
}: {
  title: string;
  subtitle?: string;
  components: readonly ComponentStatus[];
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
  fetchedAt?: string;
  selectedItemId?: string | null;
}) {
  return (
    <List.Section title={title} subtitle={subtitle}>
      {components.map((component) => (
        <ComponentItem
          key={component.id}
          component={component}
          provider={provider}
          onRefresh={onRefresh}
          fetchedAt={fetchedAt}
          selected={selectedItemId === componentItemId(component.id)}
        />
      ))}
    </List.Section>
  );
}

function ComponentItem({
  component,
  provider,
  onRefresh,
  fetchedAt,
  selected,
}: {
  component: ComponentStatus;
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
  fetchedAt?: string;
  selected: boolean;
}) {
  const status = componentStatusPresentation(component);
  const lazy = useLazyComponentHistory(component, provider, fetchedAt, selected);
  const history = component.history ?? lazy.history;
  const uptime = formatUptimePercent(history?.uptimePercent, history?.uptimeText);
  return (
    <List.Item
      id={componentItemId(component.id)}
      icon={statusIcon(status.health)}
      title={component.name}
      accessories={[{ text: status.label }]}
      detail={
        <List.Item.Detail
          isLoading={lazy.isLoading}
          markdown={componentDetailMarkdown(history, lazy.isLoading, lazy.error)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={component.name} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Status" text={status.label} />
              {uptime ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Uptime" text={uptime} />
                </>
              ) : null}
              {history ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="History" text={historyDescription(history)} />
                </>
              ) : null}
              {history?.monitoredSince ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Monitored Since" text={history.monitoredSince.slice(0, 10)} />
                </>
              ) : null}
              {fetchedAt ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Fetched" text={new Date(fetchedAt).toLocaleString()} />
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ComponentActions component={component} provider={provider} onRefresh={onRefresh} />}
    />
  );
}

function useLazyComponentHistory(
  component: ComponentStatus,
  provider: ProviderDefinition,
  fetchedAt: string | undefined,
  selected: boolean,
): { history?: ComponentHistory; isLoading: boolean; error?: string } {
  const [state, setState] = useState<{ history?: ComponentHistory; isLoading: boolean; error?: string }>({
    isLoading: false,
  });
  const requestRef = useRef<{ key: string; controller: AbortController; status: "loading" | "success" } | undefined>(
    undefined,
  );

  useEffect(() => {
    const fetchHistory = provider.adapter.fetchComponentHistory;
    if (!selected || component.history || !fetchHistory) {
      if (requestRef.current?.status === "loading") {
        requestRef.current.controller.abort();
        requestRef.current = undefined;
        setState((current) => ({ ...current, isLoading: false }));
      }
      return;
    }
    const requestKey = `${component.id}:${fetchedAt ?? "unknown"}`;
    if (requestRef.current?.key === requestKey) return;
    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const request = { key: requestKey, controller, status: "loading" as const };
    requestRef.current = request;
    setState({ isLoading: true });
    void fetchHistory(component.id, controller.signal)
      .then((history) => {
        if (controller.signal.aborted || requestRef.current !== request) return;
        if (history) {
          requestRef.current = { ...request, status: "success" };
        } else {
          requestRef.current = undefined;
        }
        setState({ history, isLoading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestRef.current !== request) return;
        requestRef.current = undefined;
        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : "Component history could not be loaded.",
        });
      });
  }, [component.history, component.id, fetchedAt, provider.adapter, selected]);
  useEffect(() => () => requestRef.current?.controller.abort(), []);

  return state;
}

function componentDetailMarkdown(
  history: ComponentHistory | undefined,
  isLoading: boolean,
  error: string | undefined,
): string {
  const historyMarkdown = buildComponentHistoryMarkdown(history);
  if (historyMarkdown) return historyMarkdown;
  if (isLoading) return "Loading component history…";
  if (error) return "Component history could not be loaded. Current status is still available.";
  return "No component history is published for this service.";
}

function historyDescription(history: ComponentHistory): string {
  return `${history.windowDays}-day ${history.basis === "incidents" ? "incident" : "availability"} history`;
}

function componentItemId(componentId: string): string {
  return `component:${componentId}`;
}

function componentCount(count: number): string {
  return `${count} component${count === 1 ? "" : "s"}`;
}

function componentCollectionMetadata(count: number, affectedCount: number): string {
  if (affectedCount > 0 && affectedCount < count) {
    return `${affectedCount} of ${count} affected`;
  }
  return componentCount(count);
}
