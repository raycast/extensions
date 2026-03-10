import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getGlobalShortcuts,
  isAppBundlePresent,
  isKommandInstalled,
} from "./lib/database";
import {
  APP_STORE_URL,
  KommandNotInstalledView,
  openKommand,
  ShortcutItem,
} from "./lib/components";

export default function ShowGlobalShortcuts() {
  const { data, isLoading, error } = usePromise(getGlobalShortcuts, [], {
    execute: isKommandInstalled(),
  });

  if (!isKommandInstalled()) {
    return <KommandNotInstalledView />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Something Went Wrong"
          description={String(error)}
        />
      </List>
    );
  }

  if (!isLoading && data && data.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Global Shortcuts"
          description="Mark shortcuts as global in Kommand to see them here."
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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search global shortcuts">
      {(data ?? []).map((appGroup) => (
        <List.Section
          key={appGroup.bundleId}
          title={appGroup.appName}
          subtitle={`${appGroup.shortcuts.length}`}
        >
          {appGroup.shortcuts.map((s) => (
            <ShortcutItem key={s.id} shortcut={s} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
