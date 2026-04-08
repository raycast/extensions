import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  collectGroupKeyCodes,
  serializeKeyCodes,
  translateSerializedKeyCodes,
} from "./lib/key-layout-helper";
import {
  findKommandAppPath,
  getAllShortcuts,
  hasKommandLibrary,
} from "./lib/database";
import {
  KommandNotInstalledView,
  KommandSetupView,
  openKommand,
  ShortcutItem,
} from "./lib/components";

export default function SearchShortcuts() {
  const hasLibrary = hasKommandLibrary();

  const { data, isLoading, error } = usePromise(getAllShortcuts, [], {
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
          title="No Shortcuts Saved"
          description="Open Kommand to start adding keyboard shortcuts."
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
      searchBarPlaceholder="Search all shortcuts"
    >
      {(data ?? []).map((appGroup) => (
        <List.Section
          key={appGroup.bundleId}
          title={appGroup.appName}
          subtitle={`${appGroup.shortcuts.length}`}
        >
          {appGroup.shortcuts.map((s) => (
            <ShortcutItem
              key={s.id}
              shortcut={s}
              subtitle={s.categoryIsDefault ? undefined : s.categoryName}
              keyLabels={keyLabels}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
