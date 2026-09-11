import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { listResourceServers, getAuth0ErrorMessage } from "./utils/auth0-client";
import { isTenantConfigured } from "./utils/tenant-storage";
import { useActiveTenant } from "./utils/use-active-tenant";
import { ResourceServer } from "./utils/types";
import { parseTenantDomain } from "./utils/formatting";
import ApiDetail from "./components/ApiDetail";
import TenantDropdown from "./components/TenantDropdown";

/** Raycast command: browse Auth0 APIs (resource servers) with client-side filtering and tenant switching. */
export default function ViewApis() {
  const { tenantId, tenant, tenants, switchTenant, isLoading: tenantsLoading } = useActiveTenant();
  const [searchText, setSearchText] = useState("");
  const [apis, setApis] = useCachedState<ResourceServer[]>(`apis-${tenantId}`, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevTenantId = useRef(tenantId);
  const { tenantSlug, region } = parseTenantDomain(tenant?.domain ?? "");

  const fetchApis = useCallback(async () => {
    if (!tenant) return;

    if (!isTenantConfigured(tenant)) {
      setError(`Please configure ${tenant.name} credentials`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await listResourceServers(tenant);
      setApis(results);
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "read:resource_servers");
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Fetch Failed",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (prevTenantId.current !== tenantId) {
      setApis([]);
      prevTenantId.current = tenantId;
    }

    if (!tenant) return;
    fetchApis();
  }, [fetchApis, tenantId, tenant]);

  const filtered = useMemo(
    () =>
      apis.filter((api) => {
        if (!searchText) return true;
        const term = searchText.toLowerCase();
        return (api.name?.toLowerCase().includes(term) ?? false) || api.identifier.toLowerCase().includes(term);
      }),
    [apis, searchText],
  );

  if (error && !apis.length) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Configuration Required" description={error} />
      </List>
    );
  }

  if (!tenantsLoading && tenants.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Globe}
          title="No Tenants Configured"
          description="Use the Switch Tenant command to add a tenant first"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || tenantsLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter APIs..."
      navigationTitle="View APIs"
      searchBarAccessory={<TenantDropdown tenantId={tenantId} tenants={tenants} onTenantChange={switchTenant} />}
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No APIs"
          description={searchText ? "No APIs match your filter" : "No APIs found for this tenant"}
        />
      )}
      {filtered.map((api) => (
        <List.Item
          key={api.id}
          icon={Icon.Globe}
          title={api.name ?? "Unnamed API"}
          subtitle={api.identifier}
          accessories={[...(api.scopes?.length ? [{ text: `${api.scopes.length} scopes` }] : [])]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<ApiDetail api={api} tenant={tenant!} />} />
              <Action.CopyToClipboard
                title="Copy Identifier"
                content={api.identifier}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {tenant?.domain && (
                <Action.OpenInBrowser
                  title="Open in Auth0 Dashboard"
                  url={`https://manage.auth0.com/dashboard/${region}/${tenantSlug}/apis/${api.id}/settings`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => fetchApis()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
