import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { execFileAsync, getErrorMessage, openCmuxApp } from "./cli";

export interface Surface {
  ref: string;
  name: string;
  workspaceRef: string;
  workspaceName: string;
  isSelected: boolean;
  isActive: boolean;
}

interface SurfaceListProps {
  surfaces: Surface[];
  isLoading?: boolean;
  searchBarPlaceholder: string;
  groupByWorkspace?: boolean;
}

export async function listSurfaces(): Promise<Surface[]> {
  const output = await execFileAsync("cmux", ["tree", "--all"]);
  const lines = output.split("\n");

  const surfaces: Surface[] = [];
  let currentWorkspaceRef = "";
  let currentWorkspaceName = "";

  for (const line of lines) {
    const workspaceMatch = line.match(/workspace\s+(workspace:\d+)\s+"([^"]+)"/);
    if (workspaceMatch) {
      currentWorkspaceRef = workspaceMatch[1];
      currentWorkspaceName = workspaceMatch[2];
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

  return surfaces;
}

export async function focusSurface(workspaceRef: string, ref: string) {
  try {
    await openCmuxApp();
    await execFileAsync("cmux", ["select-workspace", "--workspace", workspaceRef]);
    await execFileAsync("cmux", ["move-surface", "--surface", ref, "--focus", "true", "--after-surface", ref]);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to focus surface",
      message: getErrorMessage(error),
    });
  }
}

function SurfaceItem({ surface }: { surface: Surface }) {
  return (
    <List.Item
      key={surface.ref}
      title={surface.name}
      accessories={[...(surface.isActive ? [{ tag: { value: "active", color: Color.Green } }] : [])]}
      actions={
        <ActionPanel>
          <Action
            title="Focus Surface"
            icon={Icon.ArrowRight}
            onAction={() => focusSurface(surface.workspaceRef, surface.ref)}
          />
        </ActionPanel>
      }
    />
  );
}

export function SurfaceList({ surfaces, isLoading, searchBarPlaceholder, groupByWorkspace = true }: SurfaceListProps) {
  const workspaces = [...new Set(surfaces.map((surface) => surface.workspaceRef))].map((ref) => ({
    ref,
    name: surfaces.find((surface) => surface.workspaceRef === ref)?.workspaceName ?? ref,
    surfaces: surfaces.filter((surface) => surface.workspaceRef === ref),
  }));

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      {groupByWorkspace
        ? workspaces.map((workspace) => (
            <List.Section key={workspace.ref} title={workspace.name}>
              {workspace.surfaces.map((surface) => (
                <SurfaceItem key={surface.ref} surface={surface} />
              ))}
            </List.Section>
          ))
        : surfaces.map((surface) => <SurfaceItem key={surface.ref} surface={surface} />)}
    </List>
  );
}
