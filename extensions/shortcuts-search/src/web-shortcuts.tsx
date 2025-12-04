import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Application } from "./model/internal/internal-models";
import useAllShortcuts from "./load/shortcuts-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { getFrontmostHostname } from "./engine/frontmost-hostname-fetcher";
import { exitWithMessage } from "./view/exit-action";

export default function WebShortcuts() {
  const [application, setApplication] = useState<Application>();
  const [hostname, setHostname] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const shortcutsProviderResponse = useAllShortcuts();

  useEffect(() => {
    if (isLoading || application || shortcutsProviderResponse.isLoading) {
      return;
    }
    if (!hostname) {
      exitWithMessage("No current web application found");
      return;
    }

    const foundApp = shortcutsProviderResponse.data.applications.find((app) => app.hostname === hostname);
    if (!foundApp) {
      exitWithMessage(`Shortcuts not available for application ${hostname}`);
      return;
    }
    setApplication(foundApp);
  }, [shortcutsProviderResponse.isLoading, hostname, application, isLoading]);

  usePromise(getFrontmostHostname, [], {
    onData: (fetchedHostname) => {
      setIsLoading(false);
      if (!fetchedHostname) return;
      setHostname(fetchedHostname);
    },
  });

  return <ShortcutsList application={application} />;
}
