import {
  Action,
  ActionPanel,
  getFrontmostApplication,
  List,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
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
import { tokenizeForKeywords } from "./lib/keymap";

type Scope = "all" | "global";

function ScopeDropdown(props: { onChange: (value: Scope) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter shortcuts"
      storeValue={true}
      onChange={(newValue) => props.onChange(newValue as Scope)}
    >
      <List.Dropdown.Item title="All Shortcuts" value="all" />
      <List.Dropdown.Item title="Global Only" value="global" />
    </List.Dropdown>
  );
}

export default function SearchShortcuts() {
  const hasLibrary = hasKommandLibrary();
  const [scope, setScope] = useState<Scope>("all");

  const { data, isLoading, error } = usePromise(getAllShortcuts, [], {
    execute: hasLibrary,
  });

  const { data: frontmostBundleId } = usePromise(async () => {
    const app = await getFrontmostApplication();
    return app.bundleId ?? "";
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

  const filteredGroups =
    scope === "global"
      ? (data ?? [])
          .map((group) => ({
            ...group,
            shortcuts: group.shortcuts.filter((s) => s.isGlobal),
          }))
          .filter((group) => group.shortcuts.length > 0)
      : (data ?? []);

  const orderedGroups: {
    group: (typeof filteredGroups)[number];
    isCurrent: boolean;
  }[] = [];
  for (const group of filteredGroups) {
    const isCurrent =
      !!frontmostBundleId && group.bundleId === frontmostBundleId;
    if (isCurrent) orderedGroups.unshift({ group, isCurrent });
    else orderedGroups.push({ group, isCurrent });
  }

  return (
    <List
      isLoading={isLoading || labelsLoading}
      searchBarPlaceholder="Search shortcuts"
      searchBarAccessory={<ScopeDropdown onChange={setScope} />}
    >
      <List.EmptyView
        title={
          scope === "global" ? "No Global Shortcuts" : "No Shortcuts Saved"
        }
        description={
          scope === "global"
            ? "Mark shortcuts as global in Kommand to see them here."
            : "Open Kommand to start adding keyboard shortcuts."
        }
        actions={
          <ActionPanel>
            <Action title="Open Kommand" onAction={openKommand} />
          </ActionPanel>
        }
      />
      {orderedGroups.map(({ group, isCurrent }) => (
        <List.Section
          key={group.bundleId}
          title={isCurrent ? `${group.appName} · Current App` : group.appName}
          subtitle={`${group.shortcuts.length}`}
        >
          {group.shortcuts.map((s) => (
            <ShortcutItem
              key={s.id}
              shortcut={s}
              subtitle={s.categoryIsDefault ? undefined : s.categoryName}
              keyLabels={keyLabels}
              extraKeywords={tokenizeForKeywords(group.appName)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
