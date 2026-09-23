import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AppForm } from "./components/app-form";
import { AuthActions } from "./components/auth-guard";
import { useApps } from "./lib/hooks";
import { getActiveAppId, removeApp, setActiveAppId } from "./lib/storage";
import { clientFor } from "./lib/clerk";
import type { ClerkApp } from "./types";

type Stats = { users: number; orgs: number; error: boolean };

export default function ManageApps() {
  const { data: apps = [], isLoading, revalidate } = useApps();
  const { data: activeId, revalidate: revalidateActive } = useCachedPromise(getActiveAppId, []);

  // Counts load asynchronously so the management list stays instant (LocalStorage only).
  const {
    data: stats = {},
    isLoading: statsLoading,
    revalidate: revalidateStats,
  } = useCachedPromise(
    async (list: ClerkApp[]): Promise<Record<string, Stats>> => {
      const entries = await Promise.all(
        list.map(async (app) => {
          try {
            const [u, o] = await Promise.all([
              clientFor(app).users.getUserList({ limit: 1 }),
              clientFor(app).organizations.getOrganizationList({ limit: 1 }),
            ]);
            return [app.id, { users: u.totalCount, orgs: o.totalCount, error: false }] as const;
          } catch {
            return [app.id, { users: 0, orgs: 0, error: true }] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    [apps],
    { execute: apps.length > 0, initialData: {} },
  );

  function refresh() {
    revalidate();
    revalidateActive();
    revalidateStats();
  }

  async function activate(app: ClerkApp) {
    await setActiveAppId(app.id);
    revalidate();
    revalidateActive();
    await showToast({ style: Toast.Style.Success, title: `Active app: ${app.name}` });
  }

  async function remove(app: ClerkApp) {
    const ok = await confirmAlert({
      title: `Remove ${app.name}?`,
      message: "This deletes the stored secret key from Raycast.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await removeApp(app.id);
    refresh();
    await showToast({ style: Toast.Style.Success, title: `Removed ${app.name}` });
  }

  function statAccessories(app: ClerkApp): List.Item.Accessory[] {
    const s = stats[app.id];
    if (!s) return [];
    if (s.error) return [{ tag: { value: "Key error", color: Color.Red } }];
    return [{ text: `${s.users} users` }, { text: `${s.orgs} orgs` }];
  }

  return (
    <List isLoading={isLoading || statsLoading}>
      {apps.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No Clerk apps yet"
          description="Open the Clerk dashboard, copy a secret key, then add it here."
          actions={<AuthActions onChanged={refresh} />}
        />
      ) : (
        apps.map((app) => (
          <List.Item
            key={app.id}
            icon={app.id === activeId ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={app.name}
            accessories={[{ tag: app.instanceType }, ...statAccessories(app)]}
            actions={
              <ActionPanel>
                <Action title="Set as Active" icon={Icon.Check} onAction={() => activate(app)} />
                <Action.Push title="Edit App" icon={Icon.Pencil} target={<AppForm app={app} onSaved={refresh} />} />
                <Action.Push
                  title="Add App"
                  icon={Icon.Plus}
                  target={<AppForm onSaved={refresh} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Remove App"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(app)}
                />
                <Action
                  title="Refresh Stats"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidateStats()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
