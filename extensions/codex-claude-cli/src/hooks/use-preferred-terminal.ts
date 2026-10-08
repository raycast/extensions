import type { Application } from "@raycast/api";
import { useEffect, useState } from "react";

import { preferredTerminalApplication, subscribePreferredTerminalApplication } from "../lib/terminal";

export function usePreferredTerminalApplication(): Application {
  const [application, setApplication] = useState<Application>(preferredTerminalApplication);

  useEffect(() => {
    const synchronize = () => {
      const nextApplication = preferredTerminalApplication();
      setApplication((currentApplication) =>
        applicationKey(currentApplication) === applicationKey(nextApplication) ? currentApplication : nextApplication,
      );
    };
    synchronize();
    const unsubscribe = subscribePreferredTerminalApplication(synchronize);
    return unsubscribe;
  }, []);

  return application;
}

function applicationKey(application: Application): string {
  return [application.bundleId, application.path, application.localizedName, application.name]
    .filter(Boolean)
    .join("\0");
}
