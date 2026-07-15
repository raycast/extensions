import { getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { useApps } from "./load/apps-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { exitWithMessage } from "./view/exit-action";

interface AppShortcutsProps {
  slug?: string;
}

export default function AppShortcuts(props?: AppShortcutsProps) {
  const [slug, setSlug] = useState<string | undefined>(props?.slug);

  const { isLoading: appsLoading, data: apps } = useApps();
  const { isLoading: shortcutsLoading, data: application } = useAppShortcuts(slug);

  // Get the frontmost application's bundleId if no slug provided
  const { isLoading: bundleIdLoading, data: bundleId } = usePromise(
    async () => {
      try {
        return (await getFrontmostApplication()).bundleId;
      } catch {
        return undefined;
      }
    },
    [],
    {
      execute: !props?.slug,
    }
  );

  // If we have a bundleId but no slug, look up the slug from apps list
  useEffect(() => {
    if (slug || appsLoading || bundleIdLoading) {
      return;
    }
    if (!bundleId) {
      exitWithMessage("Could not detect the frontmost application");
      return;
    }
    const foundApp = apps.find((app) => app.bundleId === bundleId);
    if (!foundApp) {
      exitWithMessage(`Shortcuts not available for application ${bundleId}`);
      return;
    }
    setSlug(foundApp.slug);
  }, [bundleId, bundleIdLoading, slug, apps, appsLoading]);

  const isLoading = appsLoading || shortcutsLoading || (!props?.slug && bundleIdLoading);

  return <ShortcutsList application={application} isLoading={isLoading} />;
}
