import { Action, ActionPanel, Color, Icon, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthActions } from "./components/auth-guard";
import { useApps } from "./lib/hooks";
import { getActiveAppId, setActiveAppId } from "./lib/storage";
import type { ClerkApp } from "./types";

export default function SwitchApp() {
  const { data: apps = [], isLoading, revalidate } = useApps();
  const { data: activeId, revalidate: revalidateActive } = useCachedPromise(getActiveAppId, []);

  async function activate(app: ClerkApp) {
    await setActiveAppId(app.id);
    await showHUD(`Switched to ${app.name}`);
  }

  return (
    <List isLoading={isLoading}>
      {apps.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No Clerk apps yet"
          description="Add an app in Manage Apps first."
          actions={
            <AuthActions
              onChanged={() => {
                revalidate();
                revalidateActive();
              }}
            />
          }
        />
      ) : (
        apps.map((app) => (
          <List.Item
            key={app.id}
            icon={app.id === activeId ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={app.name}
            accessories={[{ tag: app.instanceType }]}
            actions={
              <ActionPanel>
                <Action title="Set as Active" icon={Icon.Check} onAction={() => activate(app)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
