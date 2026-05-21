import { ActionPanel, Action, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFileAsync, getErrorMessage, openCmuxApp } from "./cli";
import { Surface, SurfaceList } from "./surfaces";

interface Workspace {
  ref: string;
  name: string;
  description?: string | null;
  isSelected: boolean;
  keywords: string[];
}

interface Window {
  ref: string;
  isCurrent: boolean;
  workspaces: Workspace[];
}

interface CmuxTree {
  windows?: CmuxWindow[];
}

interface CmuxWindow {
  ref: string;
  current?: boolean;
  workspaces?: CmuxWorkspace[];
}

interface CmuxWorkspace {
  ref: string;
  title: string;
  description?: string | null;
  selected?: boolean;
  panes?: CmuxPane[];
}

interface CmuxPane {
  surfaces?: CmuxSurface[];
}

interface CmuxSurface {
  ref: string;
  title: string;
  selected?: boolean;
  selected_in_pane?: boolean;
  active?: boolean;
  here?: boolean;
  type?: string;
  tty?: string | null;
  url?: string | null;
}

function compactKeywords(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.replace(/\s+/g, " ").trim()).filter(Boolean))] as string[];
}

function getWorkspaceSurfaces(workspace: CmuxWorkspace): Surface[] {
  return (workspace.panes ?? []).flatMap((pane) =>
    (pane.surfaces ?? []).map((surface) => ({
      ref: surface.ref,
      name: surface.title,
      workspaceRef: workspace.ref,
      workspaceName: workspace.title,
      isSelected: Boolean(surface.selected ?? surface.selected_in_pane),
      isActive: Boolean(surface.active ?? surface.here),
    })),
  );
}

function getWorkspaceKeywords(workspace: CmuxWorkspace, surfaces: Surface[]) {
  return compactKeywords([
    workspace.description,
    ...surfaces.flatMap((surface) => [surface.name, surface.ref, surface.workspaceName]),
    ...(workspace.panes ?? []).flatMap((pane) =>
      (pane.surfaces ?? []).flatMap((surface) => [surface.type, surface.tty, surface.url]),
    ),
  ]);
}

async function getTreeData(): Promise<{ windows: Window[]; surfaces: Surface[] }> {
  const tree = JSON.parse(await execFileAsync("cmux", ["tree", "--all", "--json"])) as CmuxTree;

  const surfaces: Surface[] = [];
  const windows =
    tree.windows?.map((window) => ({
      ref: window.ref,
      isCurrent: Boolean(window.current),
      workspaces: (window.workspaces ?? []).map((workspace) => {
        const workspaceSurfaces = getWorkspaceSurfaces(workspace);
        surfaces.push(...workspaceSurfaces);

        return {
          ref: workspace.ref,
          name: workspace.title,
          description: workspace.description,
          isSelected: Boolean(workspace.selected),
          keywords: getWorkspaceKeywords(workspace, workspaceSurfaces),
        };
      }),
    })) ?? [];

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
              keywords={workspace.keywords}
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
