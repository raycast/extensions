import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { focusWorkspace, listWindows, listWorkspaces } from "./lib/workspaces";
import { ServerUnavailable } from "./serverState";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const [workspaces, windows] = await Promise.all([listWorkspaces(), listWindows()]);
    return { workspaces, windows };
  }, []);

  const windowsFor = (name: string) => (data?.windows ?? []).filter((w) => w.workspace === name);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Jump to a workspace…">
      {error && <ServerUnavailable error={error} onRecovered={revalidate} />}

      <List.Section title="In use">
        {(data?.workspaces ?? [])
          .filter((w) => !w.isEmpty)
          .map((w) => (
            <WorkspaceItem
              key={w.name}
              name={w.name}
              focused={w.isFocused}
              apps={windowsFor(w.name)}
              onDone={revalidate}
            />
          ))}
      </List.Section>

      <List.Section title="Empty">
        {(data?.workspaces ?? [])
          .filter((w) => w.isEmpty)
          .map((w) => (
            <WorkspaceItem key={w.name} name={w.name} focused={w.isFocused} apps={[]} onDone={revalidate} />
          ))}
      </List.Section>
    </List>
  );
}

function WorkspaceItem({
  name,
  focused,
  apps,
  onDone,
}: {
  name: string;
  focused: boolean;
  apps: { appName: string }[];
  onDone: () => void;
}) {
  // Distinct app names read better than a raw window count — three Chrome windows is
  // still "Chrome" as far as knowing what's over there is concerned.
  const names = [...new Set(apps.map((a) => a.appName))];
  return (
    <List.Item
      icon={{
        source: focused ? Icon.CircleFilled : Icon.Circle,
        tintColor: focused ? Color.Green : Color.SecondaryText,
      }}
      title={name}
      subtitle={names.join(", ")}
      accessories={apps.length > 0 ? [{ text: `${apps.length}` }] : []}
      actions={
        <ActionPanel>
          <Action
            title="Go to Workspace"
            icon={Icon.ArrowRight}
            onAction={async () => {
              try {
                await focusWorkspace(name);
                await closeMainWindow();
                onDone();
              } catch (e) {
                await showToast({ style: Toast.Style.Failure, title: "Couldn't switch", message: String(e) });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
