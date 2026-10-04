import { Action, ActionPanel, getFrontmostApplication, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { useApps } from "./load/apps-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { exitWithMessage } from "./view/exit-action";
import { getPlatform } from "./load/platform";
import { findMatchingApps, windowsProcessName } from "./app-matching";
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
  const matches = useMemo(() => (native ? findMatchingApps(apps, native, getPlatform()) : []), [apps, native]);

  useEffect(() => {
    if (slug || appsLoading || appIdLoading) return;
    if (!native) {
      exitWithMessage("Could not detect the frontmost application");
      return;
    }
    if (matches.length === 0) {
      exitWithMessage(`Shortcuts not available for application ${native.name}`);
      return;
    }
    if (matches.length === 1) setSlug(matches[0].slug);
  }, [native, appIdLoading, slug, matches, appsLoading]);

  const { isLoading: targetLoading, data: selectedTarget } = usePromise(
    async (app) => (app ? getDesktopTarget(app) : undefined),
    [application],
    {
      failureToastOptions: { title: "Could not resolve the application target" },
    }
  );
  const currentProcess = getPlatform() === "windows" && !props?.slug && native ? windowsProcessName(native) : undefined;
  const currentIdentityVerified =
    application &&
    (!application.windowsAppId ||
      native?.windowsAppId === application.windowsAppId ||
      (!native?.windowsAppId &&
        !targetLoading &&
        selectedTarget &&
        "windowsProcessName" in selectedTarget &&
        selectedTarget.windowsProcessName.toLowerCase() === currentProcess?.toLowerCase()));
  const target = currentProcess
    ? currentIdentityVerified
      ? { kind: "desktop" as const, windowsProcessName: currentProcess }
      : undefined
    : targetLoading
      ? undefined
      : selectedTarget;

  if (!slug && !appsLoading && !appIdLoading && matches.length > 1) {
    return (
      <List navigationTitle={`Shortcuts for ${native?.name}`} searchBarPlaceholder="Choose a shortcut collection">
        {matches.map((app) => (
          <List.Item
            key={app.slug}
            title={app.name}
            subtitle={app.customAppId ? "My App" : "Public Catalog"}
            icon={Icon.AppWindow}
            actions={
              <ActionPanel>
                <Action title="Show Shortcuts" onAction={() => setSlug(app.slug)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

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
