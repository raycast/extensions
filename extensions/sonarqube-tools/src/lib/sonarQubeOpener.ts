import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { Preferences } from "../utils";
import { __ } from "../i18n";

const DEFAULT_SONARQUBE_PORT = "9000";

/**
 * Logic to Open SonarQubelication or web URL
 */
export async function openSonarQubeAppLogic() {
  const preferences = getPreferenceValues<Preferences>();

  // Determine the target path based on preferences
  let targetPath: string;

  // If an app path is specified, use that directly
  if (preferences.sonarqubeAppPath && preferences.sonarqubeAppPath.trim() !== "") {
    targetPath = preferences.sonarqubeAppPath;
  } else {
    // Otherwise use localhost with the custom port or default port
    const port = preferences.sonarqubePort?.trim() || DEFAULT_SONARQUBE_PORT;
    targetPath = `http://localhost:${port}`;
  }

  try {
    await open(targetPath);
    await showToast({
      style: Toast.Style.Success,
      title: __("commands.openSonarQubeApp.title"),
      message: `${__("commands.openSonarQubeApp.opening")} ${targetPath}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: __("commands.openSonarQubeApp.openError"),
      message: errorMessage,
    });
    console.error(__("errors.generic", { message: `${targetPath}` }));
    console.error(errorMessage);
  }
}
