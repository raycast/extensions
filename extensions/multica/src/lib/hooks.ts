import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getMe, listAgents, listIssueStatuses, listMembers, listWorkspaces } from "./api";
import { getCredentials } from "./config";
import type { Agent, IssueStatus, Member, User, Workspace } from "./types";

// Errors surface through the returned `error` instead of a toast.
const ignoreError = () => undefined;

function preferredWorkspaceId(): string | undefined {
  try {
    return getCredentials().workspaceId;
  } catch {
    return undefined;
  }
}

/**
 * The workspace list plus the selected workspace, shared across commands.
 * `launchWorkspaceId` (e.g. from the menu bar) wins and becomes the new selection.
 */
export function useWorkspace(launchWorkspaceId?: string) {
  const { data: workspaces, isLoading, error } = useCachedPromise(listWorkspaces, [], { onError: ignoreError });
  const [selectedId, setSelectedId] = useCachedState<string | undefined>("workspace-id", undefined);
  const [override, setOverride] = useState(launchWorkspaceId);

  useEffect(() => {
    if (launchWorkspaceId) setSelectedId(launchWorkspaceId);
  }, [launchWorkspaceId]);

  const setWorkspaceId = (id: string) => {
    setOverride(undefined);
    setSelectedId(id);
  };

  const wantedId = override ?? selectedId;
  const workspace =
    workspaces?.find((w) => w.id === wantedId) ??
    workspaces?.find((w) => w.id === preferredWorkspaceId()) ??
    workspaces?.[0];

  return { workspaces, workspace, setWorkspaceId, isLoading, error };
}

export interface WorkspaceContext {
  workspace: Workspace;
  me?: User;
  members?: Member[];
  agents?: Agent[];
  statuses?: IssueStatus[];
}

/** People, agents, and statuses for a workspace, used to label issues. */
export function useWorkspaceContext(workspace: Workspace | undefined) {
  const id = workspace?.id ?? "";
  const execute = Boolean(workspace);

  const me = useCachedPromise(getMe, [], { onError: ignoreError });
  const members = useCachedPromise(listMembers, [id], { execute });
  const agents = useCachedPromise(listAgents, [id], { execute });
  const statuses = useCachedPromise(listIssueStatuses, [id], { execute });

  const context: WorkspaceContext | undefined = workspace
    ? { workspace, me: me.data, members: members.data, agents: agents.data, statuses: statuses.data }
    : undefined;

  return {
    context,
    isLoading: me.isLoading || members.isLoading || agents.isLoading || statuses.isLoading,
    revalidateAgents: agents.revalidate,
  };
}
