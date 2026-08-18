import { LinearClient } from "@linear/sdk";

import { bootstrapWorkspaceAuth, getLinearClientFor } from "../api/linearClient";
import { entryKey, getActiveEntry, migrateIfNeeded } from "../api/workspaces";

function parseWorkspaceId(workspaceId: string): { orgId: string; userId: string } {
  const separator = workspaceId.indexOf(":");
  if (separator <= 0 || separator === workspaceId.length - 1) {
    throw new Error(
      `Invalid workspaceId "${workspaceId}". Use a workspaceId value returned by the get-workspaces tool.`,
    );
  }
  return { orgId: workspaceId.slice(0, separator), userId: workspaceId.slice(separator + 1) };
}

// AI-tool wrapper (replaces withWorkspaceAuth for tools — §4.3: AI tools NEVER trigger
// an OAuth browser flow). Bootstraps the active workspace non-interactively so the sync
// fast path serves workspaceId-less calls; when the call names its target explicitly,
// a dead ACTIVE workspace must not block it (resolveToolClient resolves the target
// independently), so bootstrap failure is tolerated in that case.
export function withToolAuth<T extends { workspaceId?: string }, R>(
  fn: (inputs: T) => Promise<R>,
): (inputs: T) => Promise<R> {
  return async (inputs: T) => {
    try {
      await bootstrapWorkspaceAuth({ interactive: false });
    } catch {
      if (!inputs?.workspaceId) {
        throw new Error(
          "No authenticated Linear workspace is available. Ask the user to open the Manage Workspaces command in Raycast to sign in (or re-authenticate), or pass a workspaceId from get-workspaces to act in another workspace.",
        );
      }
    }
    // Defensive: previously zero-arg tools now destructure inputs; guarantee an object.
    return fn(inputs ?? ({} as T));
  };
}

// Per-call workspace routing (D6/S8): every AI tool call is a fresh process, so the
// workspaceId input is the ONLY way to route a call. Absent → active workspace.
export async function resolveToolClient(workspaceId?: string): Promise<LinearClient | undefined> {
  if (!workspaceId) return undefined;
  const ref = parseWorkspaceId(workspaceId);
  const registry = await migrateIfNeeded({ allowWrite: false });
  if (!registry.workspaces.some((w) => entryKey(w) === workspaceId)) {
    // Unknown/stale id is a ROUTING error, not an auth error — tell the model to re-list.
    throw new Error(
      `No connected workspace matches workspaceId "${workspaceId}". Call get-workspaces again and use one of its returned values.`,
    );
  }
  try {
    // interactive: false — AI tools never open a browser flow (§4.3).
    const { linearClient } = await getLinearClientFor(ref, { interactive: false });
    return linearClient;
  } catch {
    throw new Error(
      `The workspace for "${workspaceId}" needs re-authentication. Ask the user to open the Manage Workspaces command in Raycast.`,
    );
  }
}

export async function describeToolWorkspace(workspaceId?: string): Promise<string | undefined> {
  const registry = await migrateIfNeeded({ allowWrite: false });
  if (!workspaceId && registry.workspaces.length < 2) return undefined; // single workspace: keep confirmations unchanged (T1)
  const target = workspaceId ? registry.workspaces.find((w) => entryKey(w) === workspaceId) : getActiveEntry(registry);
  if (!target) return workspaceId; // unknown id: show it verbatim so the user can spot the problem
  const duplicated = registry.workspaces.filter((w) => w.orgId === target.orgId).length > 1;
  return duplicated ? `${target.orgName} (${target.userEmail})` : target.orgName;
}
