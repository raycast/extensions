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
  ref?: string;
  current?: boolean;
  workspaces?: CmuxWorkspace[];
}

interface CmuxWorkspace {
  ref?: string;
  title?: string;
  name?: string;
  description?: string | null;
  selected?: boolean;
  panes?: CmuxPane[];
}

interface CmuxPane {
  surfaces?: CmuxSurface[];
}

interface CmuxSurface {
  ref?: string;
  title?: string | null;
  name?: string | null;
  selected?: boolean;
  selected_in_pane?: boolean;
  active?: boolean;
  here?: boolean;
  focused?: boolean;
  type?: string;
  tty?: string | null;
  url?: string | null;
}

function compactKeywords(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.replace(/\s+/g, " ").trim()).filter(Boolean))] as string[];
}

function getWorkspaceSurfaces(workspace: CmuxWorkspace, workspaceRef: string, workspaceName: string): Surface[] {
  return (workspace.panes ?? []).flatMap((pane) =>
    (pane.surfaces ?? []).flatMap((surface) => {
      if (!surface.ref) {
        return [];
      }

      const name = surface.title ?? surface.name ?? surface.ref;
      return [
        {
          ref: surface.ref,
          name,
          workspaceRef,
          workspaceName,
          isSelected: Boolean(surface.selected ?? surface.selected_in_pane),
          isActive: Boolean(surface.active ?? surface.here ?? surface.focused),
          keywords: compactKeywords([workspace.description, surface.url]),
        },
      ];
    }),
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

function parseJsonTreeData(output: string): { windows: Window[]; surfaces: Surface[] } {
  const tree = JSON.parse(output) as CmuxTree;

  const surfaces: Surface[] = [];
  const windows =
    tree.windows?.map((window) => ({
      ref: window.ref ?? "window",
      isCurrent: Boolean(window.current),
      workspaces: (window.workspaces ?? []).flatMap((workspace) => {
        const ref = workspace.ref;
        const name = workspace.title ?? workspace.name;

        if (!ref || !name) {
          return [];
        }

        const workspaceSurfaces = getWorkspaceSurfaces(workspace, ref, name);
        surfaces.push(...workspaceSurfaces);

        return [
          {
            ref,
            name,
            description: workspace.description,
            isSelected: Boolean(workspace.selected),
            keywords: getWorkspaceKeywords(workspace, workspaceSurfaces),
          },
        ];
      }),
    })) ?? [];

  return { windows, surfaces };
}

function parseTextTreeData(output: string): { windows: Window[]; surfaces: Surface[] } {
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
      currentWindow.workspaces.push({ ref, name, isSelected, keywords: [] });
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

function isJsonFlagUnsupported(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("json") &&
    (message.includes("unknown") ||
      message.includes("unsupported") ||
      message.includes("unrecognized") ||
      message.includes("invalid option") ||
      message.includes("no such option"))
  );
}

async function getTreeData(): Promise<{ windows: Window[]; surfaces: Surface[] }> {
  try {
    const output = await execFileAsync("cmux", ["tree", "--all", "--json"]);
    return parseJsonTreeData(output);
  } catch (error) {
    if (!isJsonFlagUnsupported(error)) {
      throw error;
    }

    const output = await execFileAsync("cmux", ["tree", "--all"]);
    return parseTextTreeData(output);
  }
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
