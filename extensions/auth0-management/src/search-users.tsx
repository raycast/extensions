import { List, ActionPanel, Action, showToast, Toast, Icon, Color, Image } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { useCachedState } from "@raycast/utils";
import { searchUsers, createUser, getAuth0ErrorMessage } from "./utils/auth0-client";
import { isTenantConfigured } from "./utils/tenant-storage";
import { useActiveTenant } from "./utils/use-active-tenant";
import { User } from "./utils/types";
import { formatDate, buildUserDashboardUrl } from "./utils/formatting";
import UserDetail from "./components/UserDetail";
import SessionDetail from "./components/SessionDetail";
import CreateUserForm from "./components/CreateUserForm";
import ViewBlockedUsers from "./view-blocked-users";
import TenantDropdown from "./components/TenantDropdown";

/** Raycast command: search Auth0 users by name, email, or user ID with a tenant dropdown. */
export default function SearchUsers() {
  const { tenantId, tenant, tenants, switchTenant, isLoading: tenantsLoading } = useActiveTenant();
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useCachedState<User[]>(`users-${tenantId}`, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevTenantId = useRef(tenantId);

  const doSearch = useCallback(
    async (term: string) => {
      if (!tenant) return;

      if (!isTenantConfigured(tenant)) {
        setError(`Please configure ${tenant.name} credentials`);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchUsers(tenant, term);
        setUsers(results);
      } catch (err) {
        const message = getAuth0ErrorMessage(err, "read:users");
        setError(message);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [tenant],
  );

  useEffect(() => {
    if (prevTenantId.current !== tenantId) {
      setUsers([]);
      prevTenantId.current = tenantId;
    }

    if (!tenant) return;

    const timer = setTimeout(() => {
      doSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, doSearch, tenantId, tenant]);

  const handleCreateUser = useCallback(
    async (values: { email: string; password: string; connection: string; name?: string }) => {
      if (!tenant) return;
      try {
        await createUser(tenant, values);
        showToast({ style: Toast.Style.Success, title: "User Created", message: values.email });
        doSearch(searchText);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create User",
          message: getAuth0ErrorMessage(err, "create:users"),
        });
      }
    },
    [tenant, doSearch, searchText],
  );

  if (error && !users.length) {
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
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, email, or user ID..."
      navigationTitle="Search Users"
      searchBarAccessory={<TenantDropdown tenantId={tenantId} tenants={tenants} onTenantChange={switchTenant} />}
    >
      {users.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Users Found"
          description={searchText ? "Try a different search term" : "Start typing to search users"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create User"
                icon={Icon.AddPerson}
                target={<CreateUserForm tenant={tenant!} onSubmit={handleCreateUser} />}
              />
            </ActionPanel>
          }
        />
      )}
      {users.map((user) => (
        <List.Item
          key={user.user_id}
          icon={user.picture ? { source: user.picture, mask: Image.Mask.Circle } : Icon.Person}
          title={user.email}
          subtitle={user.name}
          accessories={[
            ...(user.blocked ? [{ tag: { value: "Blocked", color: Color.Red } }] : []),
            ...(user.email_verified
              ? [{ icon: { source: Icon.Check, tintColor: Color.Green }, tooltip: "Email Verified" }]
              : []),
            { text: `Logins: ${user.logins_count ?? 0}` },
            { text: formatDate(user.last_login), tooltip: "Last login" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<UserDetail user={user} tenant={tenant!} />} />
              <Action.Push
                title="View Sessions & Grants"
                //TODO: use a different icon here if there are active sessions or grants?
                icon={Icon.TwoArrowsClockwise}
                target={<SessionDetail user={user} tenant={tenant!} />}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
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
              <Action.Push
                title="View Blocked Users"
                icon={Icon.Lock}
                target={<ViewBlockedUsers />}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => doSearch(searchText)}
              />
              <Action.Push
                title="Create User"
                icon={Icon.AddPerson}
                target={<CreateUserForm tenant={tenant!} onSubmit={handleCreateUser} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
