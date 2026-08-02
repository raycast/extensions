import { Action, ActionPanel, Alert, Clipboard, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { deleteCustomShortcut, duplicateCustomShortcut } from "../lib/storage";
import { getShortcuts } from "../lib/shortcut-data";
import { buildSearchKeywords, getFullShortcutText, getShortcutSubtitle } from "../lib/shortcut-format";
import { searchShortcuts } from "../lib/shortcut-search";
import { SCOPE_LABELS, SOURCE_LABELS } from "../lib/labels";
import type { ScopeType, Shortcut, ShortcutFilter, SourceType } from "../types/shortcut";
import { ShortcutDetails } from "./ShortcutDetails";
import { ShortcutForm } from "./ShortcutForm";

type Props = {
  filter: ShortcutFilter;
  intent?: "search" | "manage";
};

type ViewFilterValue = "all" | `source:${SourceType}` | `scope:${ScopeType}` | `owner:${string}`;

const INITIAL_SEARCH_RESULT_LIMIT = 50;
const ACTIVE_SEARCH_RESULT_LIMIT = 120;

export function ShortcutList({ filter, intent = "search" }: Props) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilterValue>("all");

  async function refresh() {
    setIsLoading(true);
    try {
      setShortcuts(await getShortcuts(filter));
      setLoadError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Open Shortcut Vault again after checking storage.";
      setLoadError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load shortcuts",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [filter]);

  const availableFilters = useMemo(() => getAvailableViewFilters(shortcuts), [shortcuts]);

  useEffect(() => {
    if (!isViewFilterAvailable(viewFilter, availableFilters)) {
      setViewFilter("all");
    }
  }, [availableFilters, viewFilter]);

  const filteredShortcuts = useMemo(() => applyViewFilter(shortcuts, viewFilter), [shortcuts, viewFilter]);

  const displayedShortcuts = useMemo(() => {
    const results = searchShortcuts(filteredShortcuts, searchText);

    if (intent === "manage") {
      return results;
    }

    const limit = searchText.trim() ? ACTIVE_SEARCH_RESULT_LIMIT : INITIAL_SEARCH_RESULT_LIMIT;
    return results.slice(0, limit);
  }, [filteredShortcuts, intent, searchText]);

  const activeFilterLabel = getViewFilterLabel(viewFilter);
  const hasActiveViewFilter = viewFilter !== "all";

  const emptyState = useMemo(() => {
    if (loadError) {
      return {
        title: "Could not load shortcuts",
        description: loadError,
      };
    }

    if (searchText.trim()) {
      return {
        title: "No shortcuts found",
        description: "Try command names, owner names, scopes, sources, or shortcuts like cmd p.",
      };
    }

    if (hasActiveViewFilter && filteredShortcuts.length === 0) {
      return {
        title: `No shortcuts for ${activeFilterLabel}`,
        description: "Show all results or choose a different filter.",
      };
    }

    if (intent === "manage") {
      return {
        title: "No custom shortcuts to manage",
        description: "Add a custom shortcut, then return here to edit, duplicate, or delete it.",
      };
    }

    if (filter === "custom") {
      return {
        title: "No custom shortcuts",
        description: "Add your first shortcut to make Shortcut Vault personal.",
      };
    }

    return {
      title: "No shortcuts available",
      description: "Shortcut Vault could not find any shortcuts to show.",
    };
  }, [activeFilterLabel, filteredShortcuts.length, filter, hasActiveViewFilter, intent, loadError, searchText]);

  const canAddShortcut = filter !== "default";
  const emptyActions =
    loadError || canAddShortcut || hasActiveViewFilter ? (
      <ActionPanel>
        {loadError ? <Action title="Retry" icon={Icon.Redo} onAction={refresh} /> : null}
        {hasActiveViewFilter ? (
          <Action title="Show All Results" icon={Icon.XMarkCircle} onAction={() => setViewFilter("all")} />
        ) : null}
        {canAddShortcut ? (
          <Action.Push title="Add Shortcut" icon={Icon.Plus} target={<ShortcutForm onSaved={refresh} />} />
        ) : null}
      </ActionPanel>
    ) : undefined;

  return (
    <List
      searchBarPlaceholder="Search command, keys, owner, scope, or source..."
      searchText={searchText}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        shortcuts.length > 0 ? (
          <ShortcutFilterDropdown availableFilters={availableFilters} value={viewFilter} onChange={setViewFilter} />
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.Keyboard}
        title={emptyState.title}
        description={emptyState.description}
        actions={emptyActions}
      />
      {displayedShortcuts.map((shortcut) => (
        <List.Item
          key={`${shortcut.sourceType}:${shortcut.id}`}
          title={shortcut.commandName}
          subtitle={getShortcutSubtitle(shortcut)}
          accessories={getShortcutAccessories(shortcut)}
          keywords={buildSearchKeywords(shortcut)}
          actions={<ShortcutActions shortcut={shortcut} intent={intent} onChanged={refresh} />}
        />
      ))}
    </List>
  );
}

type AvailableViewFilters = {
  sourceTypes: SourceType[];
  scopes: ScopeType[];
  owners: string[];
};

function ShortcutFilterDropdown({
  availableFilters,
  value,
  onChange,
}: {
  availableFilters: AvailableViewFilters;
  value: ViewFilterValue;
  onChange: (value: ViewFilterValue) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter shortcuts"
      value={value}
      onChange={(newValue) => onChange(newValue as ViewFilterValue)}
    >
      <List.Dropdown.Item title="All Results" value="all" />
      {availableFilters.sourceTypes.length > 1 ? (
        <List.Dropdown.Section title="Source">
          {availableFilters.sourceTypes.map((sourceType) => (
            <List.Dropdown.Item
              key={sourceType}
              title={SOURCE_LABELS[sourceType]}
              value={`source:${sourceType}`}
              icon={{
                source: sourceType === "default" ? Icon.Book : Icon.Pencil,
                tintColor: sourceType === "default" ? Color.Blue : Color.Purple,
              }}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
      {availableFilters.scopes.length > 0 ? (
        <List.Dropdown.Section title="Scope">
          {availableFilters.scopes.map((scope) => (
            <List.Dropdown.Item
              key={scope}
              title={SCOPE_LABELS[scope]}
              value={`scope:${scope}`}
              icon={{ source: getScopeIcon(scope), tintColor: getScopeFilterColor(scope) }}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
      {availableFilters.owners.length > 0 ? (
        <List.Dropdown.Section title="Owner">
          {availableFilters.owners.map((ownerName) => (
            <List.Dropdown.Item
              key={ownerName}
              title={ownerName}
              value={`owner:${ownerName}`}
              icon={{ source: Icon.AppWindow, tintColor: Color.SecondaryText }}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}

function getAvailableViewFilters(shortcuts: Shortcut[]): AvailableViewFilters {
  return {
    sourceTypes: getUniqueValues(
      shortcuts.map((shortcut) => shortcut.sourceType),
      ["default", "custom"],
    ),
    scopes: getUniqueValues(
      shortcuts.map((shortcut) => shortcut.scope),
      ["global", "app", "webapp"],
    ),
    owners: Array.from(new Set(shortcuts.map((shortcut) => shortcut.ownerName))).sort((a, b) => a.localeCompare(b)),
  };
}

function getUniqueValues<T extends string>(values: T[], order: T[]): T[] {
  const valueSet = new Set(values);
  return order.filter((value) => valueSet.has(value));
}

function isViewFilterAvailable(value: ViewFilterValue, availableFilters: AvailableViewFilters): boolean {
  if (value === "all") {
    return true;
  }

  if (value.startsWith("source:")) {
    return availableFilters.sourceTypes.includes(value.replace("source:", "") as SourceType);
  }

  if (value.startsWith("scope:")) {
    return availableFilters.scopes.includes(value.replace("scope:", "") as ScopeType);
  }

  if (value.startsWith("owner:")) {
    return availableFilters.owners.includes(value.replace("owner:", ""));
  }

  return false;
}

function applyViewFilter(shortcuts: Shortcut[], value: ViewFilterValue): Shortcut[] {
  if (value === "all") {
    return shortcuts;
  }

  if (value.startsWith("source:")) {
    const sourceType = value.replace("source:", "") as SourceType;
    return shortcuts.filter((shortcut) => shortcut.sourceType === sourceType);
  }

  if (value.startsWith("scope:")) {
    const scope = value.replace("scope:", "") as ScopeType;
    return shortcuts.filter((shortcut) => shortcut.scope === scope);
  }

  if (value.startsWith("owner:")) {
    const ownerName = value.replace("owner:", "");
    return shortcuts.filter((shortcut) => shortcut.ownerName === ownerName);
  }

  return shortcuts;
}

function getViewFilterLabel(value: ViewFilterValue): string {
  if (value === "all") {
    return "all results";
  }

  if (value.startsWith("source:")) {
    return SOURCE_LABELS[value.replace("source:", "") as SourceType];
  }

  if (value.startsWith("scope:")) {
    return SCOPE_LABELS[value.replace("scope:", "") as ScopeType];
  }

  if (value.startsWith("owner:")) {
    return value.replace("owner:", "");
  }

  return "this filter";
}

function getScopeIcon(scope: ScopeType): Icon {
  switch (scope) {
    case "global":
      return Icon.Globe;
    case "app":
      return Icon.AppWindow;
    case "webapp":
      return Icon.Network;
  }
}

function getScopeFilterColor(scope: ScopeType): Color.ColorLike {
  switch (scope) {
    case "global":
      return Color.Red;
    case "app":
      return Color.Orange;
    case "webapp":
      return Color.Green;
  }
}

function getShortcutAccessories(shortcut: Shortcut): List.Item.Accessory[] {
  return [
    {
      tag: {
        value: shortcut.ownerName,
        color: getOwnerTagColor(),
      },
      tooltip: "Owner app or webapp",
    },
    {
      tag: {
        value: SOURCE_LABELS[shortcut.sourceType],
        color: shortcut.sourceType === "default" ? Color.Blue : Color.Purple,
      },
      tooltip: "Shortcut source",
    },
    {
      tag: {
        value: SCOPE_LABELS[shortcut.scope],
        color: getScopeTagColor(shortcut),
      },
      tooltip: "Shortcut scope",
    },
  ];
}

function getOwnerTagColor(): Color.ColorLike {
  return Color.SecondaryText;
}

function getScopeTagColor(shortcut: Shortcut): Color.ColorLike {
  switch (shortcut.scope) {
    case "global":
      return Color.Red;
    case "webapp":
      return Color.Green;
    case "app":
      return Color.Orange;
  }
}

function ShortcutActions({
  shortcut,
  intent,
  onChanged,
}: {
  shortcut: Shortcut;
  intent: "search" | "manage";
  onChanged: () => void;
}) {
  const isCustom = shortcut.sourceType === "custom";
  const manageActions = isCustom ? (
    <ActionPanel.Section title="Manage">
      <Action.Push
        title="Edit Shortcut"
        icon={Icon.Pencil}
        target={<ShortcutForm shortcut={shortcut} onSaved={onChanged} />}
      />
      <Action
        title="Duplicate Shortcut"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={async () => {
          try {
            await duplicateCustomShortcut(shortcut.id);
            await showToast({ style: Toast.Style.Success, title: "Shortcut duplicated" });
            onChanged();
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Could not duplicate shortcut",
              message: error instanceof Error ? error.message : "Open the list again and retry.",
            });
          }
        }}
      />
      <Action
        title="Delete Shortcut"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: "Delete custom shortcut?",
            message: `${shortcut.commandName} will be removed from Shortcut Vault.`,
            primaryAction: {
              title: "Delete Shortcut",
              style: Alert.ActionStyle.Destructive,
            },
          });

          if (!confirmed) {
            return;
          }

          try {
            await deleteCustomShortcut(shortcut.id);
            await showToast({ style: Toast.Style.Success, title: "Deleted custom shortcut" });
            onChanged();
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Could not delete shortcut",
              message: error instanceof Error ? error.message : "Open the list again and retry.",
            });
          }
        }}
      />
    </ActionPanel.Section>
  ) : null;

  return (
    <ActionPanel>
      {intent === "manage" ? manageActions : null}
      <ActionPanel.Section title="Copy">
        <Action
          title="Copy Shortcut"
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.copy(shortcut.shortcutDisplay);
            await showToast({
              style: Toast.Style.Success,
              title: shortcut.shortcutDisplay,
              message: "Shortcut copied",
            });
          }}
        />
        <Action.CopyToClipboard title="Copy Command Name" content={shortcut.commandName} />
        <Action.CopyToClipboard title="Copy Full Shortcut" content={getFullShortcutText(shortcut)} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Details">
        <Action.Push title="Show Details" icon={Icon.Sidebar} target={<ShortcutDetails shortcut={shortcut} />} />
        {shortcut.sourceUrl ? <Action.OpenInBrowser title="Open Source URL" url={shortcut.sourceUrl} /> : null}
      </ActionPanel.Section>
      {intent === "search" ? manageActions : null}
    </ActionPanel>
  );
}
