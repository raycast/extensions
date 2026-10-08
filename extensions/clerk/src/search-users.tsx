import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { User } from "@clerk/backend";
import { PAGE_SIZE } from "./lib/hooks";
import { useSelectedApp } from "./lib/use-selected-app";
import { AuthGuard } from "./components/auth-guard";
import { AppDropdown } from "./components/app-dropdown";
import { CreateUserForm } from "./components/user-create-form";
import { EditUserForm } from "./components/user-edit-form";
import { UserDetail } from "./components/user-detail";
import { UserOrgs } from "./components/user-orgs";
import { SignInTokenForm } from "./components/sign-in-token-form";
import { ImpersonationTokenForm } from "./components/impersonation-token-form";
import { clientFor, dashboardUserUrl } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { showClerkError } from "./lib/errors";
import { primaryEmail, fullName } from "./lib/user";
import type { ClerkApp } from "./types";

function UsersList({ app, accessory }: { app: ClerkApp; accessory?: List.Props["searchBarAccessory"] }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (appId: string, query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).users.getUserList({ query: query || undefined, limit, offset });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [app.id, searchText],
    { onError: showClerkError },
  );

  async function runMutation(action: Promise<unknown>, optimistic: (u: User[]) => User[], title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await mutate(action, { optimisticUpdate: optimistic });
      toast.style = Toast.Style.Success;
      toast.title = `${title} — done`;
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  async function ban(user: User) {
    await runMutation(
      clientFor(app).users.banUser(user.id),
      (users) => users.map((u) => (u.id === user.id ? ({ ...u, banned: true } as User) : u)),
      `Banning ${fullName(user)}`,
    );
  }
  async function unban(user: User) {
    await runMutation(
      clientFor(app).users.unbanUser(user.id),
      (users) => users.map((u) => (u.id === user.id ? ({ ...u, banned: false } as User) : u)),
      `Unbanning ${fullName(user)}`,
    );
  }
  async function del(user: User) {
    const ok = await confirmAlert({
      title: `Delete ${fullName(user)}?`,
      message: "This permanently deletes the user in Clerk.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await runMutation(
      clientFor(app).users.deleteUser(user.id),
      (users) => users.filter((u) => u.id !== user.id),
      `Deleting ${fullName(user)}`,
    );
  }
  async function revokeSessions(user: User) {
    const ok = await confirmAlert({
      title: `Revoke all sessions for ${fullName(user)}?`,
      message: "This signs the user out of every active session.",
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await runMutation(
      (async () => {
        const sessions = await clientFor(app).sessions.getSessionList({ userId: user.id, status: "active" });
        await Promise.all(sessions.data.map((s) => clientFor(app).sessions.revokeSession(s.id)));
      })(),
      (users) => users,
      `Revoking sessions for ${fullName(user)}`,
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search users…"
      searchBarAccessory={accessory}
    >
      {(data ?? []).map((user) => (
        <List.Item
          key={user.id}
          icon={user.imageUrl ? { source: user.imageUrl } : Icon.Person}
          title={fullName(user)}
          subtitle={primaryEmail(user)}
          accessories={[
            ...(user.banned ? [{ tag: { value: "Banned", color: Color.Red } }] : []),
            ...(user.lastSignInAt ? [{ date: new Date(user.lastSignInAt), tooltip: "Last sign-in" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Sidebar}
                target={<UserDetail app={app} userId={user.id} />}
              />
              <Action.Push
                title="Create User"
                icon={Icon.AddPerson}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateUserForm app={app} onSaved={() => mutate()} />}
              />
              <Action.Push
                title="Edit User"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditUserForm app={app} user={user} onSaved={() => mutate()} />}
              />
              <Action.Push
                title="View Organizations"
                icon={Icon.Building}
                target={<UserOrgs app={app} userId={user.id} userLabel={fullName(user)} />}
              />
              {user.banned ? (
                <Action title="Unban User" icon={Icon.Checkmark} onAction={() => unban(user)} />
              ) : (
                <Action title="Ban User" icon={Icon.XMarkCircle} onAction={() => ban(user)} />
              )}
              <Action title="Revoke All Sessions" icon={Icon.Logout} onAction={() => revokeSessions(user)} />
              <Action
                title="Delete User"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => del(user)}
              />
              <Action.OpenInBrowser title="Open in Clerk Dashboard" icon={Icon.Globe} url={dashboardUserUrl(user.id)} />
              <Action.CopyToClipboard title="Copy User ID" content={user.id} />
              <Action.CopyToClipboard title="Copy Email" content={primaryEmail(user)} />
              <ActionPanel.Section title="Support">
                <Action.Push
                  title="Generate Sign-In Token"
                  icon={Icon.Key}
                  target={<SignInTokenForm app={app} userId={user.id} />}
                />
                <Action.Push
                  title="Generate Impersonation Token"
                  icon={Icon.TwoPeople}
                  target={<ImpersonationTokenForm app={app} userId={user.id} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function SearchUsers() {
  const { apps, app, isLoading, revalidate, activeKey, onAppChange } = useSelectedApp();

  if (isLoading) return <List isLoading />;
  if (!app) return <AuthGuard onChanged={revalidate} />;

  return (
    <UsersList
      app={app}
      accessory={<AppDropdown key={activeKey} apps={apps} defaultId={app.id} onChange={onAppChange} />}
    />
  );
}
