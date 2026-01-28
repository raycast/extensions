import { Application, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { executeCommand } from "./general";

export const getPreferences = () => getPreferenceValues<Preferences>();

export const resizeEditorWindow = async (editorApp: Application): Promise<void> => {
  const { resizeEditorWindowAfterLaunch, windowResizeMode } = getPreferences();

  if (!resizeEditorWindowAfterLaunch) return;

  try {
    await executeCommand(`osascript -e 'tell application "${editorApp.name}" to activate'`);

    setTimeout(() => {
      open("raycast://extensions/raycast/window-management/" + windowResizeMode);
    }, 500);
  } catch (error) {
    if (!(error instanceof Error)) return;

    showToast({ title: "Could not resize window", message: error.message, style: Toast.Style.Failure });
  }
};
