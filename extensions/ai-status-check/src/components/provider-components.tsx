import { Icon, List } from "@raycast/api";
import { buildComponentSections, type ComponentGroup } from "../domain/provider-view";
import { componentStatusPresentation, fallbackHealthLabel } from "../domain/status-presentation";
import type { ComponentStatus, ProviderStatusRecord } from "../domain/types";
import { useRefreshableProviderRecord, type RefreshProvider } from "../hooks/use-refreshable-provider-record";
import type { ProviderDefinition } from "../providers/types";
import { ComponentGroupActions, ProviderSourceActions } from "./provider-actions";
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
  const sections = buildComponentSections(components);

  if (components.length === 0) return null;

  return (
    <>
      {sections.groups.length > 0 ? (
        <List.Section title="Component Groups">
          {sections.groups.map((group) => (
            <ComponentGroupItem
              key={group.name}
              group={group}
              provider={provider}
              record={record}
              refreshProvider={refreshProvider}
              onRefresh={onRefresh}
            />
          ))}
        </List.Section>
      ) : null}
      {sections.ungrouped.length > 0 ? (
        <ComponentSection
          title="Components"
          components={sections.ungrouped}
          provider={provider}
          onRefresh={onRefresh}
        />
      ) : null}
    </>
  );
}

function ComponentGroupItem({
  group,
  provider,
  record,
  refreshProvider,
  onRefresh,
}: {
  group: ComponentGroup;
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  refreshProvider: RefreshProvider;
  onRefresh(): Promise<void>;
}) {
  return (
    <List.Item
      icon={statusIcon(group.health)}
      title={group.name}
      keywords={group.components.map((component) => component.name)}
      accessories={[{ text: fallbackHealthLabel(group.health) }, { text: componentGroupMetadata(group) }]}
      actions={
        <ComponentGroupActions
          provider={provider}
          target={
            <ComponentGroupDetail
              groupName={group.name}
              provider={provider}
              record={record}
              refreshProvider={refreshProvider}
            />
          }
          onRefresh={onRefresh}
        />
      }
    />
  );
}

function ComponentGroupDetail({
  groupName,
  provider,
  record,
  refreshProvider,
}: {
  groupName: string;
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  refreshProvider: RefreshProvider;
}) {
  const { record: currentRecord, refresh } = useRefreshableProviderRecord(provider.id, record, refreshProvider);
  const components = currentRecord.snapshot?.components.filter((component) => component.group === groupName) ?? [];

  return (
    <List
      isLoading={currentRecord.refreshState === "refreshing"}
      navigationTitle={`${provider.name} · ${groupName}`}
      searchBarPlaceholder={`Search ${groupName} components`}
    >
      {components.length > 0 ? (
        <ComponentSection
          title={groupName}
          subtitle={componentCount(components.length)}
          components={components}
          provider={provider}
          onRefresh={refresh}
        />
      ) : (
        <List.EmptyView
          icon={Icon.MinusCircle}
          title={`No ${groupName} Components`}
          description={currentRecord.refreshError ?? "This component group is no longer published."}
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
}: {
  title: string;
  subtitle?: string;
  components: readonly ComponentStatus[];
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
}) {
  return (
    <List.Section title={title} subtitle={subtitle}>
      {components.map((component) => (
        <ComponentItem key={component.id} component={component} provider={provider} onRefresh={onRefresh} />
      ))}
    </List.Section>
  );
}

function ComponentItem({
  component,
  provider,
  onRefresh,
}: {
  component: ComponentStatus;
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
}) {
  const status = componentStatusPresentation(component);
  return (
    <List.Item
      icon={statusIcon(status.health)}
      title={component.name}
      accessories={[{ text: status.label }]}
      actions={<ProviderSourceActions provider={provider} onRefresh={onRefresh} />}
    />
  );
}

function componentCount(count: number): string {
  return `${count} component${count === 1 ? "" : "s"}`;
}

function componentGroupMetadata(group: ComponentGroup): string {
  if (group.affectedCount > 0 && group.affectedCount < group.components.length) {
    return `${group.affectedCount} of ${group.components.length} affected`;
  }
  return componentCount(group.components.length);
}
