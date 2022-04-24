import { useEffect, useState } from "react";
import { Application, getApplications } from "@raycast/api";

export default function useDashApp() {
  const [dashApp, setDashApp] = useState<Application | null>(null);
  useEffect(() => {
    (async () => {
      const applications = await getApplications();
      for (const application of applications) {
        if (application.bundleId?.startsWith("com.kapeli.dash")) {
          setDashApp(application);
          return;
        }
      }
      throw new Error("Dash.app not found");
    })();
  }, []);

  return dashApp;
}
