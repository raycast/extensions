import { showToast, Toast } from "@raycast/api";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { activateWorkspace, activateWorkspaceInMemory, getWorkspaceSnapshot } from "../api/linearClient";
import { entryKey, WorkspaceEntry } from "../api/workspaces";

type WorkspaceContextValue = {
  entries: WorkspaceEntry[];
  activeEntry: WorkspaceEntry | null;
  workspaceKey: string;
  showSwitcher: boolean;
  // Entry keys currently lacking tokens (from the bootstrap snapshot, §4.2) — dropdowns
  // badge these rows so a dead workspace is visible from ordinary command UI.
  needsReauth: string[];
  switchWorkspace: (key: string) => Promise<void>;
  // Pins THIS process to a workspace without persisting a new global default (D2/D7).
  pinWorkspace: (key: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const snapshot = getWorkspaceSnapshot();
  const [activeEntry, setActiveEntryState] = useState<WorkspaceEntry | null>(snapshot?.activeEntry ?? null);
  const entries = snapshot?.registry.workspaces ?? [];

  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaceKey = activeEntry ? entryKey(activeEntry) : "single";
    return {
      entries,
      activeEntry,
      workspaceKey,
      showSwitcher: entries.length >= 2, // invisible below 2 entries (spec §5)
      needsReauth: snapshot?.needsReauth ?? [],
      async switchWorkspace(key: string) {
        // S9 guard: controlled dropdowns still report their current value on mount;
        // a no-op selection must never trigger a switch.
        if (!activeEntry || key === entryKey(activeEntry)) return;
        const target = entries.find((w) => entryKey(w) === key);
        if (!target) return;
        try {
          const entry = await activateWorkspace({ orgId: target.orgId, userId: target.userId });
          setActiveEntryState(entry);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Could not switch to ${target.orgName}`,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
      async pinWorkspace(key: string) {
        if (!activeEntry || key === entryKey(activeEntry)) return;
        const target = entries.find((w) => entryKey(w) === key);
        if (!target) return;
        const entry = await activateWorkspaceInMemory({ orgId: target.orgId, userId: target.userId });
        setActiveEntryState(entry); // context + remount boundary follow; registry default untouched
      },
    };
    // Deliberate deps: entries identity is tracked via the joined key string, not the
    // array reference (the snapshot array is re-derived each render).
  }, [activeEntry, entries.map(entryKey).join("|")]);

  // Remount boundary (§4.5): the whole command subtree remounts on switch, so
  // keepPreviousData caches and pushed detail views (WS-30) can never render the
  // previous workspace's data under the new selection.
  return (
    <WorkspaceContext.Provider value={value}>
      <WorkspaceBoundary>{children}</WorkspaceBoundary>
    </WorkspaceContext.Provider>
  );
}

function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const { workspaceKey } = useWorkspaces();
  return <ItemWithKey key={workspaceKey}>{children}</ItemWithKey>;
}

function ItemWithKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

async function noSwitchHere() {
  // Pushed views are pinned to their launch workspace (design D2); switching only
  // happens at command roots where the provider's remount boundary exists.
}

// CRITICAL: Raycast's useNavigation().push / Action.Push mounts the target in a FRESH
// React tree — ancestor contexts do NOT reach pushed views (see the in-repo precedent:
// extensions/bitwarden re-provides its contexts around every pushed component). Since
// the 20 data hooks and useWorkspaceCachedState all call useWorkspaces(), throwing
// outside the provider would crash every pushed screen (IssueDetail, ProjectIssues,
// pushed CreateIssueForm, …) — even for single-workspace users. Outside the provider we
// therefore fall back to the module-level snapshot (same process, so it is always set
// by the time anything renders); switching stays provider-only.
export function useWorkspaces(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (ctx) return ctx;
  const snapshot = getWorkspaceSnapshot();
  const activeEntry = snapshot?.activeEntry ?? null;
  return {
    entries: snapshot?.registry.workspaces ?? [],
    activeEntry,
    workspaceKey: activeEntry ? entryKey(activeEntry) : "single",
    showSwitcher: false, // pushed views never render a switcher — they are pinned flows
    needsReauth: snapshot?.needsReauth ?? [],
    switchWorkspace: noSwitchHere,
    pinWorkspace: noSwitchHere,
  };
}
