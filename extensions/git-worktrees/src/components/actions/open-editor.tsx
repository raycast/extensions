import { Worktree } from "#/config/types";
import { getPreferences, resizeEditorWindow } from "#/helpers/raycast";
import { withToast } from "#/helpers/toast";
import { Action, open } from "@raycast/api";

export const OpenEditor = ({ worktree, extraActions }: { worktree: Worktree; extraActions?: () => Promise<void> }) => {
  const { editorApp } = getPreferences();

  if (!editorApp) return null;

  return (
    <Action
      title={`Open in ${editorApp.name}`}
      icon={{ fileIcon: editorApp.path }}
      onAction={withToast({
        action: async () => {
          await Promise.all([
            extraActions ? extraActions() : Promise.resolve(),
            open(worktree.path, editorApp.bundleId),
          ]);

          return resizeEditorWindow(editorApp);
        },
        onSuccess: () => `Opening worktree in ${editorApp.name}`,
        onFailure: () => `Failed to open worktree in ${editorApp.name}`,
      })}
    />
  );
};
