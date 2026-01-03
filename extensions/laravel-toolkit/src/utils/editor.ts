import { getPreferenceValues, open, Application, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

/**
 * Opens a path in the user's configured editor.
 * Falls back to the system default if no editor is configured, but warns the user.
 */
export async function openInEditor(path: string): Promise<void> {
  const { editorApplication } = getPreferenceValues<Preferences.ManageProjects>();

  if (editorApplication) {
    try {
      if (editorApplication.path) {
        // Manual launch for specific path
        exec(`"${editorApplication.path}" "${path}"`, (error) => {
          if (error) {
            console.error("Failed to open with editor:", error);
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to open in selected editor",
              message: error.message,
            });
          }
        });
      } else {
        // Fallback if path is missing
        await open(path, editorApplication);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open with editor",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    // No editor configured: Do NOT open in Finder. FAIL explicitly.
    showToast({
      style: Toast.Style.Failure,
      title: "No Editor Configured",
      message: "Please select your Code Editor in the Extension Settings.",
    });
    // We intentionally do NOT call open(path) here anymore.
  }
}

/**
 * Gets the configured editor application, if any.
 */
export function getEditorApp(): Application | undefined {
  const { editorApplication } = getPreferenceValues<Preferences.ManageProjects>();
  return editorApplication;
}
