import {
  Action,
  ActionPanel,
  getFrontmostApplication,
  List,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getShortcutsForApp,
  isAppBundlePresent,
  isKommandInstalled,
} from "./lib/database";
import {
  APP_STORE_URL,
  groupByCategory,
  KommandNotInstalledView,
  openKommand,
  ShortcutItem,
} from "./lib/components";

export default function ShowShortcuts() {
  const {
    data: app,
    isLoading: appLoading,
    error: appError,
  } = usePromise(async () => {
    const app = await getFrontmostApplication();
    return { name: app.name ?? "Unknown", bundleId: app.bundleId ?? "" };
  });

  const {
    data: shortcuts,
    isLoading: dbLoading,
    error: dbError,
  } = usePromise(
    async (bundleId: string) => getShortcutsForApp(bundleId),
    [app?.bundleId ?? ""],
    {
      execute: isKommandInstalled() && !!app?.bundleId,
    },
  );

  if (!isKommandInstalled()) {
    return <KommandNotInstalledView />;
  }

  if (appError || dbError) {
    return (
      <List>
        <List.EmptyView
          title="Something Went Wrong"
          description={String(appError ?? dbError)}
        />
      </List>
    );
  }

  const isLoading = appLoading || dbLoading;
  const appName = app?.name ?? "…";

  if (!isLoading && shortcuts && shortcuts.length === 0) {
    return (
      <List>
        <List.EmptyView
          title={`No Shortcuts for ${appName}`}
          description="Open Kommand to add shortcuts for this app."
          actions={
            <ActionPanel>
              {isAppBundlePresent() ? (
                <Action title="Open Kommand" onAction={openKommand} />
              ) : (
                <Action.OpenInBrowser
                  title="Get Kommand on App Store"
                  url={APP_STORE_URL}
                />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { favorites, sections } = groupByCategory(shortcuts ?? []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search shortcuts in ${appName}`}
    >
      {favorites.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favorites.length}`}>
          {favorites.map((s) => (
            <ShortcutItem key={s.id} shortcut={s} />
          ))}
        </List.Section>
      )}

      {sections.map((section) => (
        <List.Section
          key={section.name}
          title={section.name}
          subtitle={`${section.shortcuts.length}`}
        >
          {section.shortcuts.map((s) => (
            <ShortcutItem key={s.id} shortcut={s} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
