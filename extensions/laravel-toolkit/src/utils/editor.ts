import { getPreferenceValues, open, Application, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

interface EditorPreferences {
  editorApplication?: Application;
}

/**
 * Opens a path in the user's configured editor.
 * Falls back to the system default if no editor is configured, but warns the user.
 */
export async function openInEditor(path: string): Promise<void> {
  const { editorApplication } = getPreferenceValues<EditorPreferences>();

  if (editorApplication) {
    console.log("Attempting to open with editor:", JSON.stringify(editorApplication, null, 2));

    try {
      if (editorApplication.path) {
        // Manual launch for maximum reliability on Windows
        // Quote paths to handle spaces safely
        exec(`"${editorApplication.path}" "${path}"`);
      } else {
        // Fallback if path is missing for some reason (rare)
        await open(path, editorApplication);
      }
    } catch (error) {
      // If specific app fails, warn the user
      console.error("Failed to open with editor:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open in selected editor",
        message: "Check if the editor path is correct.",
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
  const { editorApplication } = getPreferenceValues<EditorPreferences>();
  return editorApplication;
}
