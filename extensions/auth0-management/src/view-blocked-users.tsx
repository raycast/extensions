import { List, ActionPanel, Action, showToast, Toast, Icon, Color, Image, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { useCachedState } from "@raycast/utils";
import { getBlockedUsers, unblockUser, getAuth0ErrorMessage } from "./utils/auth0-client";
import { isTenantConfigured } from "./utils/tenant-storage";
import { useActiveTenant } from "./utils/use-active-tenant";
import { User } from "./utils/types";
import { formatDate, buildUserDashboardUrl } from "./utils/formatting";
import UserDetail from "./components/UserDetail";
import TenantDropdown from "./components/TenantDropdown";

/** Raycast command: list blocked Auth0 users with the ability to unblock them. */
export default function ViewBlockedUsers() {
  const { tenantId, tenant, tenants, switchTenant, isLoading: tenantsLoading } = useActiveTenant();
  const [blockedUsers, setBlockedUsers] = useCachedState<User[]>(`blocked-users-${tenantId}`, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevTenantId = useRef(tenantId);

  const fetchBlockedUsers = useCallback(async () => {
    if (!tenant) return;

    if (!isTenantConfigured(tenant)) {
      setError(`Please configure ${tenant.name} credentials`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await getBlockedUsers(tenant);
      setBlockedUsers(results);
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "read:users");
      setError(message);
      showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message });
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (prevTenantId.current !== tenantId) {
      setBlockedUsers([]);
      prevTenantId.current = tenantId;
    }

    if (!tenant) return;
    fetchBlockedUsers();
  }, [fetchBlockedUsers, tenantId, tenant]);

  const handleUnblock = async (user: User) => {
    if (!tenant) return;

    const confirmed = await confirmAlert({
      title: `Unblock ${user.email}?`,
      message: "This will allow the user to log in again.",
      primaryAction: { title: "Unblock", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Unblocking user\u2026" });
      await unblockUser(tenant, user.user_id);
      await showToast({ style: Toast.Style.Success, title: "User Unblocked", message: user.email });
      await fetchBlockedUsers();
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "update:users");
      showToast({ style: Toast.Style.Failure, title: "Unblock Failed", message });
    }
  };

  if (error && !blockedUsers.length) {
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
          icon={Icon.Building}
          title="No Tenants Configured"
          description="Use the Switch Tenant command to add a tenant first"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || tenantsLoading}
      searchBarPlaceholder="Filter blocked users..."
      navigationTitle="View Blocked Users"
      searchBarAccessory={<TenantDropdown tenantId={tenantId} tenants={tenants} onTenantChange={switchTenant} />}
    >
      {blockedUsers.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Blocked Users"
          description="No users are currently blocked on this tenant"
        />
      )}
      {blockedUsers.map((user) => (
        <List.Item
          key={user.user_id}
          icon={user.picture ? { source: user.picture, mask: Image.Mask.Circle } : Icon.Person}
          title={user.email}
          subtitle={user.name}
          accessories={[
            tenant ? { tag: { value: tenant.environment, color: tenant.color } } : {},
            { tag: { value: "Blocked", color: Color.Red } },
            { text: formatDate(user.last_login), tooltip: "Last login" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<UserDetail user={user} tenant={tenant!} />} />
              <Action
                title="Unblock User"
                icon={Icon.LockUnlocked}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                onAction={() => handleUnblock(user)}
              />
              <Action.CopyToClipboard
                title="Copy User ID"
                content={user.user_id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard
                title="Copy Email"
                content={user.email}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              {tenant?.domain && (
                <Action.OpenInBrowser
                  title="Open in Auth0 Dashboard"
                  url={buildUserDashboardUrl(tenant.domain, user.user_id)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => fetchBlockedUsers()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
