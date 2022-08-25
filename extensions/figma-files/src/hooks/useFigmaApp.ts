import { getApplications } from "@raycast/api";
import { useState } from "react";

import type { Application } from "@raycast/api";

export const useFigmaApp = (): Application | undefined => {
  const [desktopApp, setDesktopApp] = useState<Application>();

  getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);

  return desktopApp;
};
