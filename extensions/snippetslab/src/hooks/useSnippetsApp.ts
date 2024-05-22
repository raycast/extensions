import { useEffect, useState } from "react";
import { Application, getApplications } from "@raycast/api";

export default function useSnippetsApp(): [Application | null, boolean] {
  const [isLoading, setIsLoading] = useState(true);
  const [snippetsApp, setsnippetsApp] = useState<Application | null>(null);
  useEffect(() => {
    (async () => {
      const applications = await getApplications();
      for (const application of applications) {
        if (application.bundleId?.startsWith("com.renfei.SnippetsLab")) {
          setIsLoading(false);
          setsnippetsApp(application);
          return;
        }
      }
      setIsLoading(false);
    })();
  }, []);

  return [snippetsApp, isLoading];
}
