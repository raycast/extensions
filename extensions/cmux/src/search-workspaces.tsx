import { ActionPanel, Action, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFileAsync, getErrorMessage, openCmuxApp } from "./cli";
import { Surface, SurfaceList } from "./surfaces";

interface Workspace {
  ref: string;
  name: string;
  isSelected: boolean;
}

interface Window {
  ref: string;
  isCurrent: boolean;
  workspaces: Workspace[];
}

async function getTreeData(): Promise<{ windows: Window[]; surfaces: Surface[] }> {
  const output = await execFileAsync("cmux", ["tree", "--all"]);
  const lines = output.split("\n");

  const windows: Window[] = [];
  const surfaces: Surface[] = [];
  let currentWindow: Window | null = null;
  let currentWorkspaceRef = "";
  let currentWorkspaceName = "";

  for (const line of lines) {
    const windowMatch = line.match(/^window\s+(window:\d+)(.*)/);
    if (windowMatch) {
      currentWindow = {
        ref: windowMatch[1],
        isCurrent: windowMatch[2].includes("[current]"),
        workspaces: [],
      };
      windows.push(currentWindow);
      continue;
    }

    const workspaceMatch = line.match(/workspace\s+(workspace:\d+)\s+"([^"]+)"(.*)/);
    if (workspaceMatch && currentWindow) {
      const ref = workspaceMatch[1];
      const name = workspaceMatch[2];
      const meta = workspaceMatch[3];
      const isSelected = meta.includes("[selected]");
      currentWorkspaceRef = ref;
      currentWorkspaceName = name;
      currentWindow.workspaces.push({ ref, name, isSelected });
      continue;
    }

    const surfaceMatch = line.match(/surface\s+(surface:\d+)\s+\[[^\]]+\]\s+"([^"]+)"/);
    if (surfaceMatch) {
      const ref = surfaceMatch[1];
      const name = surfaceMatch[2];
      const isSelected = line.includes("[selected]");
      const isActive = line.includes("◀ active");

      surfaces.push({
        ref,
        name,
        workspaceRef: currentWorkspaceRef,
        workspaceName: currentWorkspaceName,
        isSelected,
        isActive,
      });
    }
  }

  return { windows, surfaces };
}

async function selectWorkspace(ref: string) {
  try {
    await openCmuxApp();
    await execFileAsync("cmux", ["select-workspace", "--workspace", ref]);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to select workspace",
      message: getErrorMessage(error),
    });
  }
}

function WorkspaceSurfacesList({
  workspaceRef,
  workspaceName,
  surfaces,
  isLoading,
}: {
  workspaceRef: string;
  workspaceName: string;
  surfaces: Surface[];
  isLoading: boolean;
}) {
  return (
    <SurfaceList
      surfaces={surfaces.filter((surface) => surface.workspaceRef === workspaceRef)}
      isLoading={isLoading}
      searchBarPlaceholder={`Search surfaces in ${workspaceName}...`}
      groupByWorkspace={false}
    />
  );
}

export default function Command() {
  const { data, isLoading, error } = usePromise(getTreeData);

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} title="cmux is not running" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {data?.windows.map((window, index) => (
        <List.Section
          key={window.ref}
          title={window.isCurrent ? `Window ${index + 1} (active)` : `Window ${index + 1}`}
        >
          {window.workspaces.map((workspace) => (
            <List.Item
              key={workspace.ref}
              title={workspace.name}
              accessories={[...(workspace.isSelected ? [{ tag: { value: "active", color: Color.Green } }] : [])]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Workspace"
                    icon={Icon.ArrowRight}
                    onAction={() => selectWorkspace(workspace.ref)}
                  />
                  <Action.Push
                    title="Show Surfaces"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    target={
                      <WorkspaceSurfacesList
                        workspaceRef={workspace.ref}
                        workspaceName={workspace.name}
                        surfaces={data.surfaces}
                        isLoading={isLoading}
                      />
                    }
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
