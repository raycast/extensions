import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AppForm } from "./components/app-form";
import { AuthActions } from "./components/auth-guard";
import { useApps } from "./lib/hooks";
import { getActiveAppId, removeApp, setActiveAppId } from "./lib/storage";
import type { ClerkApp } from "./types";

export default function ManageApps() {
  const { data: apps = [], isLoading, revalidate } = useApps();
  const { data: activeId, revalidate: revalidateActive } = useCachedPromise(getActiveAppId, []);

  function refresh() {
    revalidate();
    revalidateActive();
  }

  async function activate(app: ClerkApp) {
    await setActiveAppId(app.id);
    refresh();
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

  return (
    <List isLoading={isLoading}>
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
            accessories={[
              { tag: app.instanceType },
              ...(app.id === activeId ? [{ tag: { value: "Active", color: Color.Green } }] : []),
            ]}
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
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
