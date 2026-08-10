import { Action, ActionPanel, Icon, List, Toast, closeMainWindow, popToRoot, showToast } from "@raycast/api";
import { useMemo } from "react";
import { usePromise } from "@raycast/utils";
import { aerospace, failureToastOptions } from "./utils/aerospace";
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
  const { data, isLoading, error } = usePromise(listWorkspaces, [], {
    failureToastOptions: failureToastOptions("Failed to load workspaces"),
  });
  const { data: config } = useConfig();

  const workspaceKeys = useMemo(() => (config ? extractWorkspaceKeys(config) : {}), [config]);

  return (
    <List isLoading={isLoading} navigationTitle="Go to Workspace" searchBarPlaceholder="Search workspaces">
      {!isLoading && !data?.workspaces.length && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.AppWindowGrid3x3}
          title={error ? "Failed to Load Workspaces" : "No Workspaces Found"}
          description={
            error ? error.message : "AeroSpace reported no workspaces. Make sure AeroSpace is running and configured."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Aerospace Guide"
                url="https://nikitabobko.github.io/AeroSpace/guide#installation"
              />
            </ActionPanel>
          }
        />
      )}
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
