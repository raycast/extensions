import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../utils";

const DEFAULT_SONARQUBE_PORT = "9000";

/**
 * Custom hook to handle SonarQube path resolution
 * Extracts path resolution logic from the main component
 */
export function useSonarQubePath() {
  const [pathError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  /**
   * Resolves the SonarQube path based on preferences
   * Returns the path or null if there was an error
   */
  const getSonarQubePath = () => {
    // If app path is provided, use it directly
    if (preferences.sonarqubeAppPath && preferences.sonarqubeAppPath.trim() !== "") {
      return preferences.sonarqubeAppPath;
    }

    // Otherwise build URL using custom port if specified, or default port
    const port = preferences.sonarqubePort?.trim() || DEFAULT_SONARQUBE_PORT;
    return `http://localhost:${port}`;
  };

  return { getSonarQubePath, pathError };
}
