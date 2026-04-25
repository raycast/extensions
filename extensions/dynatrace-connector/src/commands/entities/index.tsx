import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { useDynatraceQuery } from "../../lib/query";
import { Entity, buildEntityQuery } from "../../lib/types/entity";
import { getActiveTenant, setActiveTenant, listTenants } from "../../lib/tenants";
import EmptyTenantState from "../../components/EmptyTenantState";
import { getActiveTenantOrMock } from "../../lib/mockTenant";
import type { TenantConfig } from "../../lib/auth";

const TYPE_ICONS: Record<string, Icon> = {
  SERVICE: Icon.Globe,
  HOST: Icon.Desktop,
  PROCESS_GROUP: Icon.Box,
  PROCESS_GROUP_INSTANCE: Icon.Box,
};

function getIcon(type: string): Icon {
  return TYPE_ICONS[type] ?? Icon.Circle;
}

export default function EntitiesCommand() {
  const [entityType, setEntityType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [allTenants, setAllTenants] = useState<TenantConfig[]>([]);

  const { data, isLoading, execute } = useDynatraceQuery<Entity>();

  // Load active tenant and all tenants once on mount
  useEffect(() => {
    Promise.all([getActiveTenantOrMock(() => getActiveTenant()), listTenants()]).then(([activeTenant, tenants]) => {
      setTenant(activeTenant);
      setAllTenants(tenants);
      setTenantChecked(true);
      setFiltersLoaded(true);
    });
  }, []);

  // Debounce search query (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute query when filters are loaded
  useEffect(() => {
    if (!filtersLoaded || !tenant) return;

    const dql = buildEntityQuery(entityType, debouncedQuery);
    execute(dql, undefined, tenant);
  }, [entityType, debouncedQuery, filtersLoaded, tenant, execute]);

  const handleTenantChange = async (id: string) => {
    await setActiveTenant(id);
    const all = await listTenants();
    const next = all.find((t) => t.id === id) ?? null;
    setTenant(next);
  };

  const entities = data?.records ?? [];

  // Group by type
  const groupedEntities = useMemo(() => {
    const groups: Record<string, Entity[]> = {};
    for (const entity of entities) {
      const type = entity["entity.type"];
      if (!groups[type]) groups[type] = [];
      groups[type].push(entity);
    }
    return groups;
  }, [entities]);

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
      searchBarPlaceholder="Search entities..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" value={entityType} onChange={setEntityType}>
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Services" value="service" />
          <List.Dropdown.Item title="Hosts" value="host" />
          <List.Dropdown.Item title="Process Groups" value="process_group" />
        </List.Dropdown>
      }
      onSearchTextChange={setSearchQuery}
      actions={
        allTenants.length > 0 ? (
          <ActionPanel>
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
          </ActionPanel>
        ) : undefined
      }
    >
      {Object.entries(groupedEntities).map(([type, items]) => (
        <List.Section key={type} title={`${type} (${items.length})`}>
          {items.map((entity) => (
            <List.Item
              key={entity["entity.id"]}
              icon={getIcon(type)}
              title={entity["entity.name"]}
              subtitle={entity["entity.id"]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={entity["entity.id"]} title="Copy Entity ID" />
                  <Action.CopyToClipboard
                    content={`${tenant?.tenantEndpoint}/ui/entity/${entity["entity.id"]}`}
                    title="Copy Entity URL"
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && entities.length === 0 && searchQuery.length > 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No entities found"
          description="Try adjusting your search query"
        />
      )}
    </List>
  );
}
