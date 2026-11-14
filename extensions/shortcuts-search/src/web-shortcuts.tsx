import { getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useApps } from "./load/apps-provider";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { ShortcutsList } from "./view/shortcuts-list";
import { getFrontmostBrowserTarget } from "./engine/frontmost-hostname-fetcher";
import { findHostnameMatch } from "./engine/hostname-matcher";
import { UnsupportedApp } from "./view/unsupported-app";
import { getPlatform, type Platform } from "./load/platform";

const SUPPORTED_BROWSERS: Record<Platform, string> = {
  macos: "Chrome, Safari, Arc, Edge, Brave, Vivaldi, Opera or Chromium",
  windows: "Chrome, Edge, Firefox, Brave, Vivaldi, Opera or Chromium",
};

const PAGE_READ_HINT: Record<Platform, string> = {
  macos:
    "Open a web page in the active tab and allow Raycast to control the browser in System Settings → Privacy & Security → Automation.",
  windows: "Open a web page in the active tab and make sure the address bar is visible.",
};

export default function WebShortcuts() {
  const [slug, setSlug] = useState<string | undefined>();

  const { isLoading: appsLoading, data: apps } = useApps();
  const { isLoading: shortcutsLoading, data: application, favorites, toggleFavorite } = useAppShortcuts(slug);

  const { data: frontmostApp } = usePromise(getFrontmostApplication, []);
  const {
    isLoading: hostnameLoading,
    data: target,
    error: targetError,
  } = usePromise(getFrontmostBrowserTarget, [], { onError: () => undefined });

  const hostname = target?.kind === "browser" ? target.hostname : null;

  // Find matching app by hostname
  useEffect(() => {
    if (hostnameLoading || slug || appsLoading || !hostname) {
      return;
    }
    const foundApp = findHostnameMatch(apps, hostname);
    if (foundApp) setSlug(foundApp.slug);
  }, [appsLoading, hostname, slug, hostnameLoading, apps]);

  if (!slug && !hostnameLoading && !appsLoading) {
    if (targetError || (target && !hostname)) {
      return (
        <UnsupportedApp
          title={`Could not read the current page${frontmostApp ? ` in ${frontmostApp.name}` : ""}`}
          description={PAGE_READ_HINT[getPlatform()]}
        />
      );
    }
    if (!hostname) {
      return (
        <UnsupportedApp
          title={frontmostApp ? `${frontmostApp.name} is not a supported browser` : "No web page detected"}
          description={`Focus a web app tab in ${SUPPORTED_BROWSERS[getPlatform()]} and run the command again.`}
        />
      );
    }
    if (!findHostnameMatch(apps, hostname)) {
      return (
        <UnsupportedApp
          title={`No shortcuts for ${hostname} yet`}
          description="Add this web app to the public Hotkys catalog using the contribution guide, or create private shortcuts on hotkys.com."
          identifier={hostname}
        />
      );
    }
  }

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
