import { Action, ActionPanel, List, Toast, closeMainWindow, popToRoot, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { aerospace } from "./utils/aerospace";
import { useConfig } from "./hooks/useConfig";
import { extractWorkspaceKeys } from "./utils/config";

async function listWorkspaces() {
  const [allOutput, focusedOutput] = await Promise.all([
    aerospace("list-workspaces", "--all"),
    aerospace("list-workspaces", "--focused"),
  ]);

  return {
    workspaces: allOutput.split("\n").filter(Boolean),
    focused: focusedOutput,
  };
}

export default function Command() {
  const { data, isLoading } = usePromise(listWorkspaces);
  const { data: config } = useConfig();

  const workspaceKeys = config ? extractWorkspaceKeys(config) : {};

  return (
    <List isLoading={isLoading} navigationTitle="Go to Workspace" searchBarPlaceholder="Search workspaces">
      {data?.workspaces.map((name) => (
        <List.Item
          key={name}
          title={name}
          subtitle={workspaceKeys[name]}
          accessories={data.focused === name ? [{ tag: "focused" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Go to Workspace"
                onAction={async () => {
                  try {
                    await aerospace("workspace", name);
                    popToRoot({ clearSearchBar: true });
                    closeMainWindow({ clearRootSearch: true });
                  } catch {
                    await showToast({ style: Toast.Style.Failure, title: "Failed to switch workspace", message: name });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
