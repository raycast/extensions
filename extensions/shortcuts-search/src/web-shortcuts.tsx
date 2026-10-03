import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useApps } from "./load/apps-provider";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { getFrontmostBrowserTarget } from "./engine/frontmost-hostname-fetcher";
import { matchesHostname } from "./engine/hostname-matcher";
import { exitWithMessage } from "./view/exit-action";

export default function WebShortcuts() {
  const [slug, setSlug] = useState<string | undefined>();

  const { isLoading: appsLoading, data: apps } = useApps();
  const { isLoading: shortcutsLoading, data: application, favorites, toggleFavorite } = useAppShortcuts(slug);

  // Get the frontmost hostname
  const { isLoading: hostnameLoading, data: target } = usePromise(getFrontmostBrowserTarget, [], {
    failureToastOptions: {
      title: "Failed to get current web page",
    },
  });

  const hostname = target?.kind === "browser" ? target.hostname : null;

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

  return (
    <ShortcutsList
      application={application}
      executionTarget={target ?? undefined}
      favorites={favorites}
      isLoading={hostnameLoading || appsLoading || shortcutsLoading}
      onToggleFavorite={toggleFavorite}
    />
  );
}
