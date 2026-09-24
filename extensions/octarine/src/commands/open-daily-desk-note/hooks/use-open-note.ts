import { useCallback } from "react";
import { Toast, showToast } from "@raycast/api";
import { useOpenTarget } from "@hooks/use-open-target";
import type { LoadStatus } from "@hooks/use-workspaces";
import { openDailyDeskNote } from "@lib/octarine";
import type { Workspace } from "@type/octarine";

type Options = {
  date: string;
  requestedWorkspace: string;
  workspaces: Workspace[];
  status: LoadStatus;
  onWorkspaceOpened?: (workspaceName: string) => Promise<void>;
  enabled?: boolean;
};

export function useOpenDailyNote({
  date,
  requestedWorkspace,
  workspaces,
  status,
  onWorkspaceOpened,
  enabled = true,
}: Options) {
  const openDailyNote = useCallback(
    async (targetDate: string, workspaceName: string): Promise<void> => {
      try {
        await openDailyDeskNote(
          targetDate,
          workspaceName,
          onWorkspaceOpened ? () => onWorkspaceOpened(workspaceName) : undefined,
        );
      } catch (error) {
        console.error("Failed to open Daily Desk note", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Open Daily Desk Note",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [onWorkspaceOpened],
  );
  const openTarget = useCallback((workspaceName: string) => openDailyNote(date, workspaceName), [date, openDailyNote]);
  const targetWorkspace = enabled && date ? requestedWorkspace : "";

  useOpenTarget({ requestedWorkspace: targetWorkspace, workspaces, status, open: openTarget });

  return openDailyNote;
}
