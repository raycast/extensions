import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { listConnections, createConnection, getAuth0ErrorMessage } from "./utils/auth0-client";
import { isTenantConfigured } from "./utils/tenant-storage";
import { useActiveTenant } from "./utils/use-active-tenant";
import { Connection } from "./utils/types";
import { parseTenantDomain } from "./utils/formatting";
import CreateConnectionForm, { CreateConnectionValues } from "./components/CreateConnectionForm";
import TenantDropdown from "./components/TenantDropdown";

const STRATEGY_LABELS: Record<string, string> = {
  auth0: "Database",
  "google-oauth2": "Google",
  facebook: "Facebook",
  apple: "Apple",
  github: "GitHub",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  windowslive: "Microsoft",
  samlp: "SAML",
  waad: "Azure AD",
  adfs: "ADFS",
  ad: "Active Directory",
  oidc: "OpenID Connect",
  email: "Passwordless (Email)",
  sms: "Passwordless (SMS)",
};

/** Raycast command: browse Auth0 database connections with tenant switching. */
export default function ViewConnections() {
  const { tenantId, tenant, tenants, switchTenant, isLoading: tenantsLoading } = useActiveTenant();
  const [searchText, setSearchText] = useState("");
  const [connections, setConnections] = useCachedState<Connection[]>(`connections-${tenantId}`, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevTenantId = useRef(tenantId);
  const { tenantSlug, region } = parseTenantDomain(tenant?.domain ?? "");

  const fetchConnections = useCallback(async () => {
    if (!tenant) return;

    if (!isTenantConfigured(tenant)) {
      setError(`Please configure ${tenant.name} credentials`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await listConnections(tenant);
      setConnections(results);
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "read:connections");
      setError(message);
      showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message });
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  const handleCreateConnection = useCallback(
    async (values: CreateConnectionValues) => {
      if (!tenant) return;
      try {
        await createConnection(tenant, values);
        showToast({
          style: Toast.Style.Success,
          title: "Database Created",
          message: values.display_name || values.name,
        });
        fetchConnections();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Database",
          message: getAuth0ErrorMessage(err, "create:connections"),
        });
      }
    },
    [tenant, fetchConnections],
  );

  useEffect(() => {
    if (prevTenantId.current !== tenantId) {
      setConnections([]);
      prevTenantId.current = tenantId;
    }

    if (!tenant) return;
    fetchConnections();
  }, [fetchConnections, tenantId, tenant]);

  const filtered = useMemo(
    () =>
      connections.filter((conn) => {
        if (!searchText) return true;
        const term = searchText.toLowerCase();
        return (
          conn.name.toLowerCase().includes(term) ||
          (conn.display_name?.toLowerCase().includes(term) ?? false) ||
          conn.strategy.toLowerCase().includes(term)
        );
      }),
    [connections, searchText],
  );

  if (error && !connections.length) {
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
          icon={Icon.HardDrive}
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
      searchBarPlaceholder="Filter connections..."
      navigationTitle="View Databases"
      searchBarAccessory={<TenantDropdown tenantId={tenantId} tenants={tenants} onTenantChange={switchTenant} />}
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No Connections"
          description={searchText ? "No connections match your filter" : "No connections found for this tenant"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Database"
                icon={Icon.Plus}
                target={<CreateConnectionForm tenant={tenant!} onSubmit={handleCreateConnection} />}
              />
            </ActionPanel>
          }
        />
      )}
      {filtered.map((conn) => (
        <List.Item
          key={conn.id}
          icon={conn.strategy === "auth0" ? Icon.HardDrive : Icon.Link}
          title={conn.display_name || conn.name}
          subtitle={conn.name}
          accessories={[
            { tag: STRATEGY_LABELS[conn.strategy] || conn.strategy },
            ...(conn.enabled_clients ? [{ text: `${conn.enabled_clients.length} apps` }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Connection Name" content={conn.name} />
              <Action.CopyToClipboard
                title="Copy Connection ID"
                content={conn.id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {tenant?.domain && (
                <Action.OpenInBrowser
                  title="Open in Auth0 Dashboard"
                  url={`https://manage.auth0.com/dashboard/${region}/${tenantSlug}/connections/database/${conn.id}/settings`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => fetchConnections()}
              />
              <Action.Push
                title="Create Database"
                icon={Icon.Plus}
                target={<CreateConnectionForm tenant={tenant!} onSubmit={handleCreateConnection} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
