import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { OrganizationResult } from "../lib/organizer";
import { UndoManager } from "../lib/undoManager";
import { formatFileSize } from "../lib/fileUtils";

interface ResultViewProps {
  result: OrganizationResult;
  location: string;
  undoManager: UndoManager;
}

export function ResultView({ result, location, undoManager }: ResultViewProps) {
  const totalItems =
    result.duplicatesRemoved +
    result.filesArchived +
    result.largeFilesMoved +
    result.filesCategorized +
    result.foldersMoved;

  const operationCounts = undoManager.getOperationCounts();
  const canUndo = operationCounts.moves > 0 || operationCounts.trashed > 0;

  const markdown = `
# ${location} Organization Complete! 🎉

${totalItems === 0 ? "✨ Your folder is already perfectly organized!" : `Successfully processed **${totalItems} items**.`}

## Summary

${
  result.duplicatesRemoved > 0
    ? `### 🗑️ Duplicates Removed
- **${result.duplicatesRemoved}** duplicate files moved to Trash
- **${formatFileSize(result.spaceSaved)}** of space freed

`
    : ""
}${
    result.filesArchived > 0
      ? `### 📅 Files Archived
- **${result.filesArchived}** old files moved to Archived folder

`
      : ""
  }${
    result.largeFilesMoved > 0
      ? `### 📦 Large Files
- **${result.largeFilesMoved}** files over 1GB moved to Large Files folder

`
      : ""
  }${
    result.filesCategorized > 0
      ? `### 🗂️ Files Organized
- **${result.filesCategorized}** ${location === "Temp Folder" ? "items organized by creation date" : "files sorted into category folders"}

`
      : ""
  }${
    result.foldersMoved > 0
      ? `### 📁 Folders Consolidated
- **${result.foldersMoved}** folders moved to Folders directory

`
      : ""
  }
## Operations Summary

- **${operationCounts.moves}** files/folders moved
- **${operationCounts.trashed}** files moved to Trash

${
  canUndo
    ? `
> ⚠️ **Undo Available**: You can undo these changes using the action below.
> Note: Files moved to Trash cannot be automatically restored - you'll need to manually restore them from Trash.
`
    : ""
}
`;

  async function handleUndo() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Undoing changes...",
      });

      const undoResult = await undoManager.undoAll();

      if (undoResult.success > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Undid ${undoResult.success} operations`,
          message: undoResult.failed > 0 ? `${undoResult.failed} operations could not be undone` : undefined,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Undo failed",
          message: `Could not undo any operations${undoResult.errors.length > 0 ? `: ${undoResult.errors[0]}` : ""}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {canUndo && (
            <Action
              title="Undo All Changes"
              onAction={handleUndo}
              shortcut={{ modifiers: ["cmd"], key: "z" }}
              style={Action.Style.Destructive}
            />
          )}
          <Action.CopyToClipboard title="Copy Summary" content={markdown} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
