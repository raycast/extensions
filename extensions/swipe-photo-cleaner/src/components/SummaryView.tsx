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
import { useEffect } from "react";
import { SessionState } from "../types";
import { commitPendingTrash } from "../lib/trash";
import { formatSize } from "../lib/images";

interface SummaryViewProps {
  state: SessionState;
}

export function SummaryView({ state }: SummaryViewProps) {
  useEffect(() => {
    const trashEntries = state.actions
      .filter((a) => a.kind === "trash" && a.pendingTrashPath)
      .map((a) => ({
        pendingPath: a.pendingTrashPath!,
        originalPath: a.photo.path,
      }));

    commitPendingTrash(trashEntries).catch(async (err) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to move files to Trash",
        message: String(err),
      });
    });
  }, []);

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
            onAction={() => open(`${process.env.HOME}/.Trash`)}
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
