import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  getPreferenceValues,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  RootConfig,
  ActionOrGroup,
  Group,
  isGroup,
  Action as ActionItem,
} from "./types";
import { getConfig, saveConfig, deleteItem, findGroupByPath } from "./storage";
import { executeAction, getActionIcon } from "./actions";
import { AddItemForm, EditItemForm } from "./forms";

const STORAGE_KEY = "leader-key-config";
const LEGACY_STORAGE_KEY = "key-mappings";

interface SearchResult {
  item: ActionOrGroup;
  path: string[];
  pathKeys: string[];
  pathLabels: string[];
  matchedOn: "label" | "value" | "key";
}

function getTimeoutMs(): number | null {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.enableTimeout) {
    return null;
  }

  const seconds = parseFloat(prefs.timeoutSeconds);
  if (isNaN(seconds)) {
    return 2500;
  }

  const clamped = Math.max(2.5, Math.min(6, seconds));
  return clamped * 1000;
}

function searchAllItems(config: RootConfig, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  function traverse(
    items: ActionOrGroup[],
    currentPath: string[],
    currentKeys: string[],
    currentLabels: string[],
  ) {
    for (const item of items) {
      const itemPath = [...currentPath, item.id];
      const itemKeys = [...currentKeys, item.key];
      const itemLabels = [...currentLabels, item.label || item.key];

      const labelMatch = item.label?.toLowerCase().includes(lowerQuery);
      const keyMatch = item.key.toLowerCase().includes(lowerQuery);
      const valueMatch =
        !isGroup(item) &&
        (item as ActionItem).value.toLowerCase().includes(lowerQuery);

      if (labelMatch || keyMatch || valueMatch) {
        results.push({
          item,
          path: itemPath,
          pathKeys: itemKeys,
          pathLabels: itemLabels,
          matchedOn: labelMatch ? "label" : valueMatch ? "value" : "key",
        });
      }

      if (isGroup(item)) {
        traverse(item.actions, itemPath, itemKeys, itemLabels);
      }
    }
  }

  traverse(config.actions, [], [], []);
  return results;
}

export default function LeaderKey() {
  const [config, setConfig] = useState<RootConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmedResults, setConfirmedResults] = useState<SearchResult[]>([]);
  const [keySequence, setKeySequence] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadConfig();
    setCurrentPath([]);
    setSearchText("");
    setSearchMode(false);
    setSearchQuery("");
    setConfirmedResults([]);
    setKeySequence("");
  }, []);

  async function loadConfig() {
    const data = await getConfig();
    setConfig(data);
    setIsLoading(false);
  }

  async function handleDelete(item: ActionOrGroup, itemPath: string[]) {
    const confirmed = await confirmAlert({
      title: "Delete Item",
      message: `Are you sure you want to delete "${item.label || item.key}"?${
        isGroup(item)
          ? ` This will also delete ${item.actions.length} child items.`
          : ""
      }`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed && config) {
      const newConfig = await deleteItem(config, itemPath);
      await saveConfig(newConfig);
      setConfig(newConfig);
      await showToast({ style: Toast.Style.Success, title: "Item deleted" });
    }
  }

  async function handleClearConfig() {
    const confirmed = await confirmAlert({
      title: "Clear Configuration",
      message:
        "This will delete all your LeaderKey shortcuts. This action cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await LocalStorage.removeItem(STORAGE_KEY);
      await LocalStorage.removeItem(LEGACY_STORAGE_KEY);
      await loadConfig();
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration cleared",
        message: "All shortcuts have been deleted",
      });
    }
  }

  const currentGroup = config
    ? currentPath.length === 0
      ? config
      : findGroupByPath(config, currentPath)
    : null;

  const items = currentGroup?.actions || [];
  const groupedItems = groupAndSortItems(items);

  const searchResults = useMemo(() => {
    if (!searchMode || !config || !searchQuery) {
      return [];
    }
    return searchAllItems(config, searchQuery);
  }, [searchMode, config, searchQuery]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const timeoutMs = getTimeoutMs();
    if (timeoutMs === null) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setSearchText("");
      setCurrentPath([]);
      setSearchMode(false);
      setSearchQuery("");
      setConfirmedResults([]);
      setKeySequence("");
    }, timeoutMs);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      resetTimeout();

      if (confirmedResults.length > 0) {
        setSearchText(text);
        setKeySequence(text);

        if (!text) {
          return;
        }

        const typedKeys = text.split("");

        const exactMatch = confirmedResults.find(
          (result) =>
            result.pathKeys.length === typedKeys.length &&
            result.pathKeys.every((key, i) => key === typedKeys[i]),
        );

        const hasLongerMatch = confirmedResults.some(
          (result) =>
            result.pathKeys.length > typedKeys.length &&
            typedKeys.every((key, i) => result.pathKeys[i] === key),
        );

        if (exactMatch && !hasLongerMatch) {
          setConfirmedResults([]);
          setKeySequence("");
          setSearchText("");
          setSearchMode(false);

          if (isGroup(exactMatch.item)) {
            setCurrentPath(exactMatch.path);
          } else {
            executeAction(exactMatch.item as ActionItem, () => {
              setCurrentPath([]);
            });
          }
          return;
        }

        if (!exactMatch && !hasLongerMatch && typedKeys.length > 0) {
          setSearchText("");
          setKeySequence("");
        }

        return;
      }

      if (searchMode) {
        setSearchQuery(text);
        setSearchText(text);
        return;
      }

      setSearchText(text);

      if (!text || !currentGroup) {
        return;
      }

      if (text.length === 1) {
        const matchingItem = currentGroup.actions.find(
          (item) => item.key === text,
        );

        if (matchingItem) {
          if (isGroup(matchingItem)) {
            setCurrentPath([...currentPath, matchingItem.id]);
            setSearchText("");
          } else {
            executeAction(matchingItem, () => {
              setCurrentPath([]);
              setSearchText("");
            });
          }
        } else {
          setSearchText("");
          showToast({
            style: Toast.Style.Failure,
            title: "No action assigned",
            message: `Key "${text}" is not bound to any action`,
          });
        }
      } else {
        setSearchText("");
      }
    },
    [currentGroup, currentPath, resetTimeout, searchMode, confirmedResults],
  );

  const handleGoBack = useCallback(() => {
    if (confirmedResults.length > 0) {
      setConfirmedResults([]);
      setKeySequence("");
      setSearchText("");
      setSearchMode(true);
      setSearchQuery("");
      return;
    }
    if (searchMode) {
      setSearchMode(false);
      setSearchQuery("");
      setSearchText("");
      return;
    }
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
      setSearchText("");
    }
  }, [currentPath, searchMode, confirmedResults]);

  const handleEnterSearchMode = useCallback(() => {
    setSearchMode(true);
    setSearchQuery("");
    setSearchText("");
  }, []);

  const handleExitSearchMode = useCallback(() => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchText("");
    setConfirmedResults([]);
    setKeySequence("");
  }, []);

  const handleConfirmSearch = useCallback(() => {
    if (searchResults.length === 0) {
      return;
    }
    setConfirmedResults(searchResults);
    setSearchQuery("");
    setSearchText("");
    setKeySequence("");
  }, [searchResults]);

  const handleExitConfirmedMode = useCallback(() => {
    setConfirmedResults([]);
    setKeySequence("");
    setSearchText("");
    setSearchMode(true);
    setSearchQuery("");
  }, []);

  const handleExecuteConfirmedResult = useCallback((result: SearchResult) => {
    setConfirmedResults([]);
    setKeySequence("");
    setSearchText("");
    setSearchMode(false);

    if (isGroup(result.item)) {
      setCurrentPath(result.path);
    } else {
      executeAction(result.item as ActionItem, () => {
        setCurrentPath([]);
      });
    }
  }, []);

  const handleSelectSearchResult = useCallback((result: SearchResult) => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchText("");

    if (isGroup(result.item)) {
      setCurrentPath(result.path);
    } else {
      const parentPath = result.path.slice(0, -1);
      setCurrentPath(parentPath);
    }
  }, []);

  const handleGoToParentGroup = useCallback((result: SearchResult) => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchText("");
    setConfirmedResults([]);
    setKeySequence("");

    const parentPath = result.path.slice(0, -1);
    setCurrentPath(parentPath);
  }, []);

  const breadcrumb = getBreadcrumb(config, currentPath);

  const getPlaceholder = () => {
    if (confirmedResults.length > 0) {
      const sequences = confirmedResults
        .slice(0, 3)
        .map((r) => r.pathKeys.join(""))
        .join(", ");
      const more = confirmedResults.length > 3 ? "..." : "";
      return `Type key sequence (${sequences}${more}) - Tab to go back`;
    }
    if (searchMode) {
      return "(Search -> Use ⌘↵ to continue using Key sequence after search, Tab to exit search)";
    }
    if (currentPath.length > 0) {
      return `${breadcrumb} → Input a key | Use "Tab" to search`;
    }
    return 'Input a key | Use "Tab" to search';
  };

  if (confirmedResults.length > 0 && config) {
    return (
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={handleSearchChange}
        searchBarPlaceholder={getPlaceholder()}
        throttle={false}
        filtering={false}
      >
        <List.Section
          title="Type Key Sequence"
          subtitle={`${confirmedResults.length} results • ${keySequence || "waiting..."}`}
        >
          {confirmedResults.map((result) => (
            <ConfirmedResultRow
              key={result.path.join("-")}
              result={result}
              currentSequence={keySequence}
              onExit={handleExitConfirmedMode}
              onExecute={() => handleExecuteConfirmedResult(result)}
              onGoToParent={() => handleGoToParentGroup(result)}
            />
          ))}
        </List.Section>
      </List>
    );
  }

  if (searchMode && config) {
    return (
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={handleSearchChange}
        searchBarPlaceholder={getPlaceholder()}
        throttle={false}
        filtering={false}
      >
        {searchResults.length > 0 ? (
          <List.Section
            title="Search Results"
            subtitle={`${searchResults.length}`}
          >
            {searchResults.map((result) => (
              <SearchResultRow
                key={result.path.join("-")}
                result={result}
                onSelect={() => handleSelectSearchResult(result)}
                onExitSearch={handleExitSearchMode}
                onConfirmSearch={handleConfirmSearch}
                onGoToParent={() => handleGoToParentGroup(result)}
              />
            ))}
          </List.Section>
        ) : searchQuery ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No results found"
            description={`No items match "${searchQuery}". Press Tab to exit search.`}
            actions={
              <ActionPanel>
                <Action
                  title="Exit Search"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: [], key: "tab" }}
                  onAction={handleExitSearchMode}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search Mode"
            description="Type to search. Press ⌘↵ to lock results and type key sequence. Tab to exit."
            actions={
              <ActionPanel>
                <Action
                  title="Exit Search"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: [], key: "tab" }}
                  onAction={handleExitSearchMode}
                />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder={getPlaceholder()}
      throttle={false}
    >
      {groupedItems.map((group) => (
        <List.Section
          key={group.type}
          title={group.label}
          subtitle={`${group.items.length}`}
        >
          {group.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              config={config!}
              currentPath={currentPath}
              onSelect={() => {
                if (isGroup(item)) {
                  setCurrentPath([...currentPath, item.id]);
                  setSearchText("");
                } else {
                  executeAction(item, () => {
                    setCurrentPath([]);
                    setSearchText("");
                  });
                }
              }}
              onGoBack={currentPath.length > 0 ? handleGoBack : undefined}
              onDelete={() => handleDelete(item, [...currentPath, item.id])}
              onConfigUpdate={(newConfig) => setConfig(newConfig)}
              onClearConfig={handleClearConfig}
              onEnterSearchMode={handleEnterSearchMode}
              push={push}
            />
          ))}
        </List.Section>
      ))}
      {items.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Folder}
          title="Empty group"
          description="Press ⌘N to add an action, ⌘⇧N for a group, or Tab to search"
          actions={
            <ActionPanel>
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: [], key: "tab" }}
                onAction={handleEnterSearchMode}
              />
              <Action
                title="Add Action"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <AddItemForm
                      config={config!}
                      parentPath={currentPath}
                      itemType="action"
                      onSave={async (newConfig) => {
                        await saveConfig(newConfig);
                        setConfig(newConfig);
                      }}
                    />,
                  )
                }
              />
              <Action
                title="Add Group"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={() =>
                  push(
                    <AddItemForm
                      config={config!}
                      parentPath={currentPath}
                      itemType="group"
                      onSave={async (newConfig) => {
                        await saveConfig(newConfig);
                        setConfig(newConfig);
                      }}
                    />,
                  )
                }
              />
              <Action
                title="Clear All Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleClearConfig}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function SearchResultRow({
  result,
  onSelect,
  onExitSearch,
  onConfirmSearch,
  onGoToParent,
}: {
  result: SearchResult;
  onSelect: () => void;
  onExitSearch: () => void;
  onConfirmSearch: () => void;
  onGoToParent: () => void;
}) {
  const isGroupItem = isGroup(result.item);
  const actionItem = result.item as ActionItem;

  function getItemIcon() {
    if (isGroupItem) {
      return Icon.Folder;
    }
    if (actionItem.type === "application") {
      return { fileIcon: actionItem.value };
    }
    return getActionIcon(actionItem.type);
  }

  const pathDisplay = result.pathKeys.join(" → ");
  const hasParent = result.path.length > 1;
  const parentLabel =
    result.pathLabels.length > 1
      ? result.pathLabels[result.pathLabels.length - 2]
      : "Root";

  return (
    <List.Item
      icon={getItemIcon()}
      title={result.item.label || result.item.key}
      subtitle={
        isGroupItem
          ? `${(result.item as Group).actions.length} items`
          : getValuePreview(actionItem)
      }
      accessories={[
        {
          tag: {
            value: pathDisplay,
            color: Color.Blue,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={isGroupItem ? "Go to Group" : "Execute"}
            icon={Icon.ArrowRight}
            onAction={onSelect}
          />
          <Action
            title="Type Keys"
            icon={Icon.Keyboard}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onAction={onConfirmSearch}
          />
          <Action
            title={hasParent ? `Go to Parent (${parentLabel})` : "Go to Root"}
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={onGoToParent}
          />
          <Action
            title="Exit Search"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: [], key: "tab" }}
            onAction={onExitSearch}
          />
        </ActionPanel>
      }
    />
  );
}

function ConfirmedResultRow({
  result,
  currentSequence,
  onExit,
  onExecute,
  onGoToParent,
}: {
  result: SearchResult;
  currentSequence: string;
  onExit: () => void;
  onExecute: () => void;
  onGoToParent: () => void;
}) {
  const isGroupItem = isGroup(result.item);
  const actionItem = result.item as ActionItem;

  function getItemIcon() {
    if (isGroupItem) {
      return Icon.Folder;
    }
    if (actionItem.type === "application") {
      return { fileIcon: actionItem.value };
    }
    return getActionIcon(actionItem.type);
  }

  const keySequenceStr = result.pathKeys.join("");
  const isExactMatch = currentSequence === keySequenceStr;
  const isMatching =
    currentSequence.length > 0 && keySequenceStr.startsWith(currentSequence);
  const hasParent = result.path.length > 1;
  const parentLabel =
    result.pathLabels.length > 1
      ? result.pathLabels[result.pathLabels.length - 2]
      : "Root";

  return (
    <List.Item
      icon={getItemIcon()}
      title={result.item.label || result.item.key}
      subtitle={
        isGroupItem
          ? `${(result.item as Group).actions.length} items`
          : getValuePreview(actionItem)
      }
      accessories={[
        {
          tag: {
            value: keySequenceStr,
            color: isExactMatch
              ? Color.Green
              : isMatching
                ? Color.Yellow
                : Color.Blue,
          },
        },
      ]}
      actions={
        <ActionPanel>
          {isExactMatch && (
            <Action
              title={isGroupItem ? "Go to Group" : "Execute"}
              icon={isGroupItem ? Icon.Folder : Icon.Play}
              onAction={onExecute}
            />
          )}
          <Action
            title={hasParent ? `Go to Parent (${parentLabel})` : "Go to Root"}
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={onGoToParent}
          />
          <Action
            title="Back to Search"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: [], key: "tab" }}
            onAction={onExit}
          />
        </ActionPanel>
      }
    />
  );
}

function ItemRow({
  item,
  config,
  currentPath,
  onSelect,
  onGoBack,
  onDelete,
  onConfigUpdate,
  onClearConfig,
  onEnterSearchMode,
  push,
}: {
  item: ActionOrGroup;
  config: RootConfig;
  currentPath: string[];
  onSelect: () => void;
  onGoBack?: () => void;
  onDelete: () => void;
  onConfigUpdate: (config: RootConfig) => void;
  onClearConfig: () => void;
  onEnterSearchMode: () => void;
  push: (component: React.ReactNode) => void;
}) {
  const isGroupItem = isGroup(item);
  const actionItem = item as ActionItem;

  function getItemIcon() {
    if (isGroupItem) {
      return Icon.Folder;
    }
    if (actionItem.type === "application") {
      return { fileIcon: actionItem.value };
    }
    return getActionIcon(actionItem.type);
  }

  return (
    <List.Item
      icon={getItemIcon()}
      title={item.label || ""}
      subtitle={
        isGroupItem
          ? `${(item as Group).actions.length} items`
          : getValuePreview(actionItem)
      }
      accessories={[
        {
          tag: {
            value: item.key,
            color: Color.Blue,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={isGroupItem ? "Open Group" : "Execute"}
            icon={isGroupItem ? Icon.Folder : Icon.Play}
            onAction={onSelect}
          />
          <Action
            title="Search"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: [], key: "tab" }}
            onAction={onEnterSearchMode}
          />
          {onGoBack && (
            <Action
              title="Go Back"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: [], key: "backspace" }}
              onAction={onGoBack}
            />
          )}
          <ActionPanel.Section title="Edit">
            <Action
              title="Edit Item"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                push(
                  <EditItemForm
                    config={config}
                    itemPath={[...currentPath, item.id]}
                    onSave={async (newConfig) => {
                      await saveConfig(newConfig);
                      onConfigUpdate(newConfig);
                    }}
                  />,
                )
              }
            />
            <Action
              title="Delete Item"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={onDelete}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Add">
            <Action
              title="Add Action"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() =>
                push(
                  <AddItemForm
                    config={config}
                    parentPath={currentPath}
                    itemType="action"
                    onSave={async (newConfig) => {
                      await saveConfig(newConfig);
                      onConfigUpdate(newConfig);
                    }}
                  />,
                )
              }
            />
            <Action
              title="Add Group"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              onAction={() =>
                push(
                  <AddItemForm
                    config={config}
                    parentPath={currentPath}
                    itemType="group"
                    onSave={async (newConfig) => {
                      await saveConfig(newConfig);
                      onConfigUpdate(newConfig);
                    }}
                  />,
                )
              }
            />
          </ActionPanel.Section>
          {!isGroupItem && (
            <Action.CopyToClipboard
              title="Copy Value"
              content={actionItem.value}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <ActionPanel.Section title="Configuration">
            <Action
              title="Clear All Configuration"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={onClearConfig}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getBreadcrumb(config: RootConfig | null, path: string[]): string {
  if (!config || path.length === 0) {
    return "";
  }

  const parts: string[] = [];
  let current: Group | RootConfig = config;

  for (const id of path) {
    const found: ActionOrGroup | undefined = current.actions.find(
      (a: ActionOrGroup) => a.id === id,
    );
    if (found && isGroup(found)) {
      parts.push(found.label || found.key);
      current = found;
    }
  }

  return parts.join(" → ");
}

function getValuePreview(action: ActionItem): string {
  const { type, value } = action;

  switch (type) {
    case "application":
      return value.split("/").pop()?.replace(".app", "") || value;
    case "url":
      if (value.startsWith("raycast://")) {
        return "Raycast: " + value.split("/").pop();
      }
      return value.length > 40 ? value.substring(0, 37) + "..." : value;
    case "folder":
      return value.split("/").pop() || value;
    case "command":
      return value.length > 40 ? value.substring(0, 37) + "..." : value;
    default:
      return value;
  }
}

type ItemType = "group" | "application" | "url" | "folder" | "command";

interface GroupedItems {
  type: ItemType;
  label: string;
  items: ActionOrGroup[];
}

const TYPE_ORDER: ItemType[] = [
  "group",
  "application",
  "url",
  "folder",
  "command",
];

const TYPE_LABELS: Record<ItemType, string> = {
  group: "Groups",
  application: "Applications",
  url: "URLs",
  folder: "Folders",
  command: "Commands",
};

function sortByKey(a: ActionOrGroup, b: ActionOrGroup): number {
  return a.key.localeCompare(b.key);
}

function groupAndSortItems(items: ActionOrGroup[]): GroupedItems[] {
  const byType = new Map<ItemType, ActionOrGroup[]>();

  for (const item of items) {
    const type = item.type as ItemType;
    const existing = byType.get(type) || [];
    existing.push(item);
    byType.set(type, existing);
  }

  const result: GroupedItems[] = [];
  for (const type of TYPE_ORDER) {
    const typeItems = byType.get(type);
    if (typeItems && typeItems.length > 0) {
      result.push({
        type,
        label: TYPE_LABELS[type],
        items: typeItems.sort(sortByKey),
      });
    }
  }

  return result;
}
