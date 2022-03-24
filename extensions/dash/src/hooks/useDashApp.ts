import { useEffect } from "react";
import { Application, getApplications } from "@raycast/api";
import { usePersistentState } from "raycast-toolkit";

export default function useDashApp(): [Application | null, boolean] {
  const [dashApp, setDashApp, isLoading] = usePersistentState<Application | null>("dashApp", null);
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

  return [dashApp, isLoading];
}
