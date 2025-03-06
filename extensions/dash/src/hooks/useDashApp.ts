import { useEffect, useState } from "react";
import { Application, getApplications } from "@raycast/api";

export default function useDashApp(): [Application | null, boolean] {
  const [isLoading, setIsLoading] = useState(true);
  const [dashApp, setDashApp] = useState<Application | null>(null);
  useEffect(() => {
    (async () => {
      const applications = await getApplications();
      for (const application of applications) {
        if (application.bundleId?.startsWith("com.kapeli.dash")) {
          setIsLoading(false);
          setDashApp(application);
          return;
        }
      }
      setIsLoading(false);
    })();
  }, []);

  return [dashApp, isLoading];
}
