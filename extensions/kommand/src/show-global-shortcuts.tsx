import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  collectGroupKeyCodes,
  serializeKeyCodes,
  translateSerializedKeyCodes,
} from "./lib/key-layout-helper";
import {
  findKommandAppPath,
  getGlobalShortcuts,
  hasKommandLibrary,
} from "./lib/database";
import {
  KommandNotInstalledView,
  KommandSetupView,
  openKommand,
  ShortcutItem,
} from "./lib/components";

export default function ShowGlobalShortcuts() {
  const hasLibrary = hasKommandLibrary();

  const { data, isLoading, error } = usePromise(getGlobalShortcuts, [], {
    execute: hasLibrary,
  });

  const { data: kommandAppPath, isLoading: appLookupLoading } = usePromise(
    findKommandAppPath,
    [],
    {
      execute: !hasLibrary,
    },
  );

  const serializedKeyCodes = serializeKeyCodes(
    collectGroupKeyCodes(data ?? []),
  );

  const { data: keyLabels, isLoading: labelsLoading } = usePromise(
    translateSerializedKeyCodes,
    [serializedKeyCodes],
    {
      execute: serializedKeyCodes.length > 0,
    },
  );

  if (!hasLibrary) {
    if (appLookupLoading) {
      return <List isLoading />;
    }
    return kommandAppPath ? <KommandSetupView /> : <KommandNotInstalledView />;
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
              <Action title="Open Kommand" onAction={openKommand} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || labelsLoading}
      searchBarPlaceholder="Search global shortcuts"
    >
      {(data ?? []).map((appGroup) => (
        <List.Section
          key={appGroup.bundleId}
          title={appGroup.appName}
          subtitle={`${appGroup.shortcuts.length}`}
        >
          {appGroup.shortcuts.map((s) => (
            <ShortcutItem key={s.id} shortcut={s} keyLabels={keyLabels} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
