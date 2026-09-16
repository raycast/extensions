import { List } from "@raycast/api";
import { buildComponentSections } from "../domain/provider-view";
import { componentStatusPresentation, componentHistoryMessage } from "../domain/status-presentation";
import type { ComponentHistory, ComponentStatus, ProviderStatusRecord } from "../domain/types";
import { useComponentHistory } from "../hooks/use-component-history";
import type { ProviderStatusStore } from "../services/provider-status-store";
import type { ProviderDefinition } from "../providers/types";
import { buildComponentHistoryMarkdown, formatUptimePercent } from "../utils/component-history-markdown";
import { ComponentActions } from "./provider-actions";
import { ProviderNotice } from "./provider-notice";
import { statusIcon } from "./status-icon";

export function ProviderComponents({
  provider,
  record,
  store,
  onRefresh,
  selectedItemId,
}: {
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  store: ProviderStatusStore;
  onRefresh(): Promise<void>;
  selectedItemId: string | null;
}) {
  const components = record.snapshot?.components ?? [];
  const sections = buildComponentSections(components);

  return (
    <>
      {components.length > 0 ? (
        <>
          {sections.groups.map((group) => (
            <ComponentSection
              key={group.name}
              title={group.name}
              subtitle={componentCount(group.components.length)}
              components={group.components}
              provider={provider}
              store={store}
              onRefresh={onRefresh}
              fetchedAt={record.snapshot?.fetchedAt}
              selectedItemId={selectedItemId}
            />
          ))}
          {sections.ungrouped.length > 0 ? (
            <ComponentSection
              title={sections.groups.length > 0 ? "Other Components" : "Components"}
              subtitle={componentCount(sections.ungrouped.length)}
              components={sections.ungrouped}
              provider={provider}
              store={store}
              onRefresh={onRefresh}
              fetchedAt={record.snapshot?.fetchedAt}
              selectedItemId={selectedItemId}
            />
          ) : null}
        </>
      ) : (
        <List.Section title="Components">
          <ProviderNotice
            id="components-unavailable"
            title="Component Data Unavailable"
            description="Open the official status page for available component information."
            provider={provider}
            onRefresh={onRefresh}
          />
        </List.Section>
      )}
    </>
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
  store,
}: {
  title: string;
  subtitle?: string;
  components: readonly ComponentStatus[];
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
  fetchedAt?: string;
  selectedItemId?: string | null;
  store: ProviderStatusStore;
}) {
  return (
    <List.Section title={title} subtitle={subtitle}>
      {components.map((component) => (
        <ComponentItem
          key={component.id}
          component={component}
          provider={provider}
          store={store}
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
  store,
}: {
  component: ComponentStatus;
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
  fetchedAt?: string;
  selected: boolean;
  store: ProviderStatusStore;
}) {
  const status = componentStatusPresentation(component);
  const lazy = useComponentHistory(store, provider.id, component.id, fetchedAt, selected);
  const history = component.history ?? lazy.history;
  const uptime = formatUptimePercent(history?.uptimePercent, history?.uptimeText);
  return (
    <List.Item
      id={componentItemId(component.id)}
      icon={statusIcon(status.health)}
      title={component.name}
      keywords={[status.label, ...(component.group ? [component.group] : [])]}
      detail={
        <List.Item.Detail
          isLoading={lazy.isLoading}
          markdown={
            buildComponentHistoryMarkdown(history) ??
            componentHistoryMessage(component.historyAvailability ?? lazy.availability, lazy.isLoading)
          }
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

function historyDescription(history: ComponentHistory): string {
  return `${history.periodDays ?? history.windowDays}-day ${history.basis === "incidents" ? "incident" : "availability"} history`;
}

function componentItemId(componentId: string): string {
  return `component:${componentId}`;
}

function componentCount(count: number): string {
  return `${count} component${count === 1 ? "" : "s"}`;
}
