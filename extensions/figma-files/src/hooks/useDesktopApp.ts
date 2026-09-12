import { useEffect, useState } from "react";
import type { Application } from "@raycast/api";
import { getApplications } from "@raycast/api";

/**
 * Custom hook for detecting the Figma desktop application
 * Returns the desktop app instance if available, undefined otherwise
 */
export function useDesktopApp(): Application | undefined {
  const [desktopApp, setDesktopApp] = useState<Application | undefined>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((app) => app.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);
  }, []);

  return desktopApp;
}
