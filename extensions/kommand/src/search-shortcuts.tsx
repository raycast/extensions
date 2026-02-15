import { Action, ActionPanel, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAllShortcuts, isKommandInstalled } from "./lib/database";
import { KommandNotInstalledView, ShortcutItem } from "./lib/components";

export default function SearchShortcuts() {
  const { data, isLoading, error } = usePromise(getAllShortcuts);

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
          title="No Shortcuts Saved"
          description="Open Kommand to start adding keyboard shortcuts."
          actions={
            <ActionPanel>
              <Action
                title="Open Kommand"
                onAction={() => open("kommand://")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search all shortcuts">
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
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
