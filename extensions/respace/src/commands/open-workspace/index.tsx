import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  closeWorkspace,
  launchWorkspace,
  verifyAllWindows,
} from "../../core/launcher/launcher";
import {
  createSession,
  deleteSession,
  getAllSessions,
  updateSession,
} from "../../core/storage/session-storage";
import { getAllWorkspaces } from "../../core/storage/storage";
import type { Workspace, WorkspaceSession } from "../../types/workspace";
import { WorkspaceListItem } from "./components/workspace-list-item";

export default function OpenWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData().catch((error) => {
      console.error("Unhandled error in loadData:", error);
    });
  }, []);

  async function loadData() {
    try {
      // Load workspaces
      const allWorkspaces = getAllWorkspaces();
      setWorkspaces(allWorkspaces);

      // Load sessions from persistent storage
      const allSessions = getAllSessions();

      // Verify sessions on load and clean up any with all windows closed
      const verifiedSessions: WorkspaceSession[] = [];
      for (const session of allSessions) {
        const verifiedWindows = await verifyAllWindows(session.windows);

        if (verifiedWindows.length > 0) {
          // Update session with verified windows if any were removed
          if (verifiedWindows.length < session.windows.length) {
            const updatedSession = updateSession(
              session.workspaceId,
              verifiedWindows,
            );
            if (updatedSession) {
              verifiedSessions.push(updatedSession);
            }
          } else {
            verifiedSessions.push(session);
          }
        } else {
          // All windows closed, remove session
          deleteSession(session.workspaceId);
        }
      }

      setSessions(verifiedSessions);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpen(workspace: Workspace) {
    try {
      // Launch workspace and get tracked windows
      const trackedWindows = await launchWorkspace(
        workspace.items,
        workspace.name,
      );

      // Create session in persistent storage
      const session = createSession(workspace.id, trackedWindows);
      setSessions((prev) => {
        // Remove any existing session for this workspace
        const filtered = prev.filter((s) => s.workspaceId !== workspace.id);
        return [...filtered, session];
      });
    } catch (error) {
      console.error("Error opening workspace:", error);
    }
  }

  async function handleClose(workspaceId: string) {
    try {
      const session = sessions.find((s) => s.workspaceId === workspaceId);
      if (!session) return;

      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      // Close the tracked windows
      await closeWorkspace(session.windows, workspace.name);

      // Remove session from persistent storage
      deleteSession(workspaceId);
      setSessions((prev) => prev.filter((s) => s.workspaceId !== workspaceId));
    } catch (error) {
      console.error("Error closing workspace:", error);
    }
  }

  const openedWorkspaceIds = sessions.map((s) => s.workspaceId);
  const openedWorkspaces = workspaces.filter((w) =>
    openedWorkspaceIds.includes(w.id),
  );
  const hasOpenedWorkspaces = openedWorkspaces.length > 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {workspaces.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No Workspaces"
          description="Create a workspace using 'Manage Workspaces' command"
        />
      ) : (
        <>
          {/* Opened Workspaces Section */}
          {hasOpenedWorkspaces && (
            <List.Section title="Opened Workspaces">
              {openedWorkspaces.map((workspace) => (
                <WorkspaceListItem
                  key={`${workspace.id}-opened`}
                  workspace={workspace}
                  onOpen={handleOpen}
                  onClose={handleClose}
                  isOpened
                />
              ))}
            </List.Section>
          )}

          {/* All Workspaces Section */}
          <List.Section title="All Workspaces">
            {workspaces.map((workspace) => (
              <WorkspaceListItem
                key={workspace.id}
                workspace={workspace}
                onOpen={handleOpen}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
