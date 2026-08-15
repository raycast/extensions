import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { homedir } from "node:os";
import { useEffect } from "react";
import { SessionState } from "../types";
import { commitPendingTrash } from "../lib/trash";
import { formatSize } from "../lib/images";

interface SummaryViewProps {
  state: SessionState;
}

export function SummaryView({ state }: SummaryViewProps) {
  const homeDirectory = homedir();

  useEffect(() => {
    const trashEntries = state.actions
      .filter((a) => a.kind === "trash" && a.pendingTrashPath)
      .map((a) => ({
        pendingPath: a.pendingTrashPath!,
        originalPath: a.photo.path,
      }));

    let cancelled = false;

    void commitPendingTrash(trashEntries)
      .then(async (failedCount) => {
        if (cancelled || failedCount === 0) {
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to move ${failedCount} file(s) to Trash`,
          message: "Some files could not be moved during final cleanup.",
        });
      })
      .catch(async (err) => {
        if (cancelled) {
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to move files to Trash",
          message: String(err),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [state.actions]);

  const markdown = `# Review Complete

| | Count |
|---|---|
| Kept | ${state.kept} |
| Trashed | ${state.trashed} |
| **Total** | **${state.photos.length}** |

**Space freed:** ${formatSize(state.spaceFreed)}
`;

  return (
    <Detail
      navigationTitle="Session Complete"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Trash"
            icon={Icon.Trash}
            onAction={() => open(`${homeDirectory}/.Trash`)}
          />
          <Action
            title="Start New Session"
            icon={Icon.RotateClockwise}
            onAction={popToRoot}
          />
        </ActionPanel>
      }
    />
  );
}
