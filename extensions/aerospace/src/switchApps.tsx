import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { aerospace, failureToastOptions } from "./utils/aerospace";

type Window = {
  "app-name": string;
  "window-title"?: string;
  "window-id": number;
  "monitor-name": string;
  "app-pid": number;
  workspace: string;
  "app-bundle-id": string;
};

type WindowWithPath = Window & { "app-path": string };

async function getWindows(workspace: string): Promise<WindowWithPath[]> {
  const args = [
    "list-windows",
    "--json",
    ...(workspace === "focused" ? ["--workspace", "focused"] : ["--all"]),
    "--format",
    "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id} %{monitor-name}",
  ];

  const [output, apps] = await Promise.all([aerospace(...args), getApplications()]);
  const pathByBundleId = new Map(apps.map((a) => [a.bundleId, a.path]));
  const windows: Window[] = JSON.parse(output);

  return windows.map((w) => ({
    ...w,
    "app-path": pathByBundleId.get(w["app-bundle-id"]) || "",
  }));
}

export default function Command(
  props: LaunchProps<{ arguments: { workspace?: string }; launchContext?: { searchText?: string } }>,
) {
  const { defaultWorkspace } = getPreferenceValues<Preferences.SwitchApps>();
  const workspace = props.arguments.workspace || defaultWorkspace;
  const [searchText, setSearchText] = useState(props.launchContext?.searchText || "");

  const { data: windows = [], isLoading } = usePromise(getWindows, [workspace], {
    failureToastOptions: failureToastOptions("Failed to load windows"),
  });

  const grouped = new Map<string, { monitor: string; windows: WindowWithPath[] }>();
  for (const w of windows) {
    const existing = grouped.get(w.workspace);
    if (existing) {
      existing.windows.push(w);
    } else {
      grouped.set(w.workspace, { monitor: w["monitor-name"], windows: [w] });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={workspace === "focused" ? "Windows in Focused Workspace" : "Windows in All Workspaces"}
      searchBarPlaceholder="Search by app name or window title..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {[...grouped.entries()].map(([workspaceName, group]) => (
        <List.Section key={workspaceName} title={`Workspace ${workspaceName} - ${group.monitor}`}>
          {group.windows
            .filter((w) => {
              if (!searchText) return true;
              const s = searchText.toLowerCase();
              return w["app-name"].toLowerCase().includes(s) || (w["window-title"] ?? "").toLowerCase().includes(s);
            })
            .map((w) => (
              <List.Item
                key={w["window-id"]}
                title={w["app-name"]}
                subtitle={w["window-title"]}
                icon={{ fileIcon: w["app-path"] }}
                actions={
                  <ActionPanel>
                    <Action
                      title="Focus Window"
                      onAction={async () => {
                        await aerospace("focus", "--window-id", String(w["window-id"]));
                        popToRoot({ clearSearchBar: true });
                        closeMainWindow({ clearRootSearch: true });
                      }}
                    />
                    <Action
                      title="Pull to Current Workspace"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["shift"], key: "enter" }}
                      onAction={async () => {
                        try {
                          const focused = await aerospace("list-workspaces", "--focused");
                          await aerospace("move-node-to-workspace", "--window-id", String(w["window-id"]), focused);
                          await aerospace("focus", "--window-id", String(w["window-id"]));
                          popToRoot({ clearSearchBar: true });
                          closeMainWindow({ clearRootSearch: true });
                        } catch {
                          await showToast({ style: Toast.Style.Failure, title: "Failed to move window" });
                        }
                      }}
                    />
                    <Action
                      title="Set to Tiling"
                      icon={Icon.AppWindowGrid3x3}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={async () => {
                        try {
                          await aerospace("layout", "tiling", "--window-id", String(w["window-id"]));
                          await showToast({ style: Toast.Style.Success, title: "Window set to tiling layout" });
                          popToRoot({ clearSearchBar: true });
                          closeMainWindow({ clearRootSearch: true });
                        } catch {
                          await showToast({ style: Toast.Style.Failure, title: "Failed to set tiling layout" });
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
