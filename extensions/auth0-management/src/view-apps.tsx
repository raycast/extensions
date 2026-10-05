import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { listApps, getAuth0ErrorMessage } from "./utils/auth0-client";
import { isTenantConfigured } from "./utils/tenant-storage";
import { useActiveTenant } from "./utils/use-active-tenant";
import { Auth0App } from "./utils/types";
import { APP_TYPE_LABELS, parseTenantDomain } from "./utils/formatting";
import AppDetail from "./components/AppDetail";
import TenantDropdown from "./components/TenantDropdown";

/** Raycast command: browse Auth0 applications with client-side filtering and tenant switching. */
export default function ViewApps() {
  const { tenantId, tenant, tenants, switchTenant, isLoading: tenantsLoading } = useActiveTenant();
  const [searchText, setSearchText] = useState("");
  const [apps, setApps] = useCachedState<Auth0App[]>(`apps-${tenantId}`, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevTenantId = useRef(tenantId);
  const { tenantSlug, region } = parseTenantDomain(tenant?.domain ?? "");

  const fetchApps = useCallback(async () => {
    if (!tenant) return;

    if (!isTenantConfigured(tenant)) {
      setError(`Please configure ${tenant.name} credentials`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await listApps(tenant);
      setApps(results);
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "read:clients");
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
      setApps([]);
      prevTenantId.current = tenantId;
    }

    if (!tenant) return;
    fetchApps();
  }, [fetchApps, tenantId, tenant]);

  const filtered = useMemo(
    () =>
      apps.filter((app) => {
        if (!searchText) return true;
        const term = searchText.toLowerCase();
        return (
          (app.name?.toLowerCase().includes(term) ?? false) ||
          (app.app_type?.toLowerCase().includes(term) ?? false) ||
          app.client_id.toLowerCase().includes(term)
        );
      }),
    [apps, searchText],
  );

  if (error && !apps.length) {
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
          icon={Icon.AppWindow}
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
      searchBarPlaceholder="Filter applications..."
      navigationTitle="View Apps"
      searchBarAccessory={<TenantDropdown tenantId={tenantId} tenants={tenants} onTenantChange={switchTenant} />}
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No Applications"
          description={searchText ? "No applications match your filter" : "No applications found for this tenant"}
        />
      )}
      {filtered.map((app) => (
        <List.Item
          key={app.client_id}
          icon={app.logo_uri ? { source: app.logo_uri } : Icon.AppWindow}
          title={app.name ?? "Unnamed App"}
          subtitle={app.app_type ? (APP_TYPE_LABELS[app.app_type] ?? app.app_type) : undefined}
          accessories={[
            ...(app.is_first_party ? [{ tag: "1st Party" }] : []),
            ...(app.grant_types?.length ? [{ text: `${app.grant_types.length} grants` }] : []),
            ...(tenant ? [{ tag: { value: tenant.environment, color: tenant.color } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<AppDetail app={app} tenant={tenant!} />} />
              <Action.CopyToClipboard
                title="Copy Client ID"
                content={app.client_id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {tenant?.domain && (
                <Action.OpenInBrowser
                  title="Open in Auth0 Dashboard"
                  url={`https://manage.auth0.com/dashboard/${region}/${tenantSlug}/applications/${app.client_id}/settings`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => fetchApps()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
