import { getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { useApps } from "./load/apps-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { exitWithMessage } from "./view/exit-action";
import { getPlatform } from "./load/platform";
import { findMatchingApp, windowsProcessName } from "./app-matching";
import { getDesktopTarget } from "./engine/desktop-target";

interface AppShortcutsProps {
  slug?: string;
  initialKeymapTitle?: string;
  initialSearchText?: string;
}

export default function AppShortcuts(props?: AppShortcutsProps) {
  const [slug, setSlug] = useState<string | undefined>(props?.slug);
  const { isLoading: appsLoading, data: apps } = useApps();
  const { isLoading: shortcutsLoading, data: application, favorites, toggleFavorite } = useAppShortcuts(slug);
  const { isLoading: appIdLoading, data: native } = usePromise(getFrontmostApplication, [], {
    execute: !props?.slug,
    failureToastOptions: { title: "Could not detect the frontmost application" },
  });

  useEffect(() => {
    if (slug || appsLoading || appIdLoading) return;
    if (!native) {
      exitWithMessage("Could not detect the frontmost application");
      return;
    }
    const found = findMatchingApp(apps, native, getPlatform());
    if (!found) {
      exitWithMessage(`Shortcuts not available for application ${native.name}`);
      return;
    }
    setSlug(found.slug);
  }, [native, appIdLoading, slug, apps, appsLoading]);

  const { isLoading: targetLoading, data: selectedTarget } = usePromise(
    async (app) => (app ? getDesktopTarget(app) : undefined),
    [application],
    {
      failureToastOptions: { title: "Could not resolve the application target" },
    }
  );
  const currentProcess = getPlatform() === "windows" && !props?.slug && native ? windowsProcessName(native) : undefined;
  const target = currentProcess
    ? { kind: "desktop" as const, windowsProcessName: currentProcess }
    : targetLoading
      ? undefined
      : selectedTarget;

  return (
    <ShortcutsList
      application={application}
      executionTarget={target}
      favorites={favorites}
      initialKeymapTitle={props?.initialKeymapTitle}
      initialSearchText={props?.initialSearchText}
      isLoading={appsLoading || shortcutsLoading || (!props?.slug && appIdLoading)}
      onToggleFavorite={toggleFavorite}
    />
  );
}
