import { showToast, Toast } from "@raycast/api";

import { PostCreateAction } from "./hooks/usePostCreateActions";
import { runShortcut } from "./shortcuts";

export type PostCreateContext = "create-form" | "quick-add";

export async function runPostCreateActions(actions: PostCreateAction[], context: PostCreateContext) {
  const applicableActions = actions.filter(
    (action) => action.enabled && (action.scope === "all" || action.scope === context),
  );

  for (const action of applicableActions) {
    try {
      await runShortcut(action.shortcutIdentifier || action.shortcutName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: `Shortcut failed: ${action.shortcutName}`,
        message,
      });
    }
  }
}
