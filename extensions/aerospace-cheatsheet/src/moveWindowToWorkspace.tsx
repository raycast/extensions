import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listWindows, listWorkspaces, moveFocusedWindowToWorkspace } from "./lib/workspaces";
import { ServerUnavailable } from "./serverState";

/**
 * Send the focused window to a workspace, including one that does not exist yet.
 *
 * AeroSpace creates a workspace the moment something moves onto it, so typing a name
 * that is not in the list is a legitimate action rather than an error. The list offers
 * it explicitly instead of leaving people to guess.
 */
export default function Command() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useCachedPromise(async () => {
    const [workspaces, windows] = await Promise.all([listWorkspaces(), listWindows()]);
    return { workspaces, windows };
  }, []);

  const workspaces = data?.workspaces ?? [];
  const appsOn = (name: string) => [
    ...new Set((data?.windows ?? []).filter((w) => w.workspace === name).map((w) => w.appName)),
  ];

  const trimmed = query.trim();
  const isNew = trimmed.length > 0 && !workspaces.some((w) => w.name.toLowerCase() === trimmed.toLowerCase());

  async function moveTo(name: string) {
    try {
      await moveFocusedWindowToWorkspace(name);
      await closeMainWindow();
      await showHUD(`Moved to workspace ${name}`);
    } catch (e) {
      await showHUD(`Couldn't move the window: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} searchBarPlaceholder="Move the focused window to…">
      {error && <ServerUnavailable error={error} />}

      {isNew && (
        <List.Section title="Create">
          <List.Item
            icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
            title={`Move to a new workspace "${trimmed}"`}
            actions={
              <ActionPanel>
                <Action title="Create and Move" icon={Icon.PlusCircle} onAction={() => moveTo(trimmed)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Workspaces">
        {workspaces.map((w) => {
          const apps = appsOn(w.name);
          return (
            <List.Item
              key={w.name}
              icon={{
                source: w.isFocused ? Icon.CircleFilled : Icon.Circle,
                tintColor: w.isFocused ? Color.Green : Color.SecondaryText,
              }}
              title={w.name}
              subtitle={apps.join(", ")}
              keywords={apps}
              accessories={w.isFocused ? [{ tag: { value: "current", color: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  <Action title="Move Window Here" icon={Icon.ArrowRight} onAction={() => moveTo(w.name)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
