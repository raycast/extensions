import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useApps } from "./load/apps-provider";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { getFrontmostHostname } from "./engine/frontmost-hostname-fetcher";
import { matchesHostname } from "./engine/hostname-matcher";
import { exitWithMessage } from "./view/exit-action";

export default function WebShortcuts() {
  const [slug, setSlug] = useState<string | undefined>();

  const { isLoading: appsLoading, data: apps } = useApps();
  const { isLoading: shortcutsLoading, data: application } = useAppShortcuts(slug);

  // Get the frontmost hostname
  const { isLoading: hostnameLoading, data: hostname } = usePromise(getFrontmostHostname, [], {
    failureToastOptions: {
      title: "Failed to get current web page",
    },
  });

  // Find matching app by hostname
  useEffect(() => {
    if (hostnameLoading || slug || appsLoading) {
      return;
    }
    if (!hostname) {
      exitWithMessage("No current web application found");
      return;
    }

    const foundApp = apps.find((app) => app.hostname !== undefined && matchesHostname(app.hostname, hostname));
    if (!foundApp) {
      exitWithMessage(`Shortcuts not available for application ${hostname}`);
      return;
    }
    setSlug(foundApp.slug);
  }, [appsLoading, hostname, slug, hostnameLoading, apps]);

  return <ShortcutsList application={application} isLoading={hostnameLoading || appsLoading || shortcutsLoading} />;
}
