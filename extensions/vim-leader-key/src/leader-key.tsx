import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  environment,
  getApplications,
  getPreferenceValues,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  type Application,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  RootConfig,
  ActionOrGroup,
  Group,
  isGroup,
  Action as ActionItem,
} from "./types";
import {
  getConfig,
  saveConfig,
  deleteItem,
  findGroupByPath,
  resolveBrowser,
} from "./storage";
import { executeAction, getActionIcon } from "./actions";
import { AddItemForm, EditItemForm } from "./forms";
import {
  groupApplicationsForOpenWith,
  type OpenWithApplicationGroups,
} from "./browser-utils";
import {
  getChildPath,
  getIdleSearchText,
  getParentPath,
  getSearchSelectionPath,
  getVisibleSearchText,
  isClearingGroupNavigationGuard,
} from "./leader-navigation";
import { getFaviconUrl, normalizeCustomIconValue } from "./url-icons";
import {
  renderKeyboardLayoutMarkdown,
  renderKeyboardLayoutMetadata,
  type KeyboardLayoutSize,
  type KeyboardLayoutMetadataRow,
} from "./keyboard-layout";

const STORAGE_KEY = "leader-key-config";
const LEGACY_STORAGE_KEY = "key-mappings";
const LAYOUT_MODE_STORAGE_KEY = "leader-key-layout-mode";
const KEYBOARD_LAYOUT_SIZE_STORAGE_KEY = "leader-key-keyboard-layout-size";

type LayoutMode = "dual-column" | "single-column";

const DEFAULT_LAYOUT_MODE: LayoutMode = "dual-column";
const DEFAULT_KEYBOARD_LAYOUT_SIZE: KeyboardLayoutSize = "default";

const KEYBOARD_LAYOUT_SIZE_LABELS: Record<KeyboardLayoutSize, string> = {
  compact: "Compact",
  default: "Default",
  large: "Large",
};

interface SearchResult {
  item: ActionOrGroup;
  path: string[];
  pathKeys: string[];
  pathLabels: string[];
  matchedOn: "label" | "value" | "key";
}

type NavigationPush = ReturnType<typeof useNavigation>["push"];

interface LeaderKeyMenuProps {
  config: RootConfig | null;
  isLoading: boolean;
  currentPath: string[];
  navigationDepth: number;
  layoutMode: LayoutMode;
  keyboardLayoutSize: KeyboardLayoutSize;
  onConfigUpdate: (config: RootConfig) => void;
  onConfigReload: () => Promise<void>;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onKeyboardLayoutSizeChange: (size: KeyboardLayoutSize) => void;
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

function normalizeLayoutMode(value: unknown): LayoutMode {
  return value === "single-column" || value === "dual-column"
    ? value
    : DEFAULT_LAYOUT_MODE;
}

function normalizeKeyboardLayoutSize(value: unknown): KeyboardLayoutSize {
  return value === "compact" || value === "default" || value === "large"
    ? value
    : DEFAULT_KEYBOARD_LAYOUT_SIZE;
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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(DEFAULT_LAYOUT_MODE);
  const [keyboardLayoutSize, setKeyboardLayoutSize] =
    useState<KeyboardLayoutSize>(DEFAULT_KEYBOARD_LAYOUT_SIZE);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    const data = await getConfig();
    setConfig(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    let isCancelled = false;

    async function loadLayoutSettings() {
      const [storedLayoutMode, storedKeyboardLayoutSize] = await Promise.all([
        LocalStorage.getItem<string>(LAYOUT_MODE_STORAGE_KEY),
        LocalStorage.getItem<string>(KEYBOARD_LAYOUT_SIZE_STORAGE_KEY),
      ]);

      if (!isCancelled) {
        setLayoutMode(normalizeLayoutMode(storedLayoutMode));
        setKeyboardLayoutSize(
          normalizeKeyboardLayoutSize(storedKeyboardLayoutSize),
        );
      }
    }

    void loadLayoutSettings();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <LeaderKeyMenu
      config={config}
      isLoading={isLoading}
      currentPath={[]}
      navigationDepth={0}
      layoutMode={layoutMode}
      keyboardLayoutSize={keyboardLayoutSize}
      onConfigUpdate={setConfig}
      onConfigReload={loadConfig}
      onLayoutModeChange={setLayoutMode}
      onKeyboardLayoutSizeChange={setKeyboardLayoutSize}
    />
  );
}

function LeaderKeyMenu({
  config,
  isLoading,
  currentPath,
  navigationDepth,
  layoutMode,
  keyboardLayoutSize,
  onConfigUpdate,
  onConfigReload,
  onLayoutModeChange,
  onKeyboardLayoutSizeChange,
}: LeaderKeyMenuProps) {
  const [searchText, setSearchText] = useState(() =>
    getIdleSearchText(currentPath),
  );
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmedResults, setConfirmedResults] = useState<SearchResult[]>([]);
  const [keySequence, setKeySequence] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { push, pop } = useNavigation();

  const resetMenuState = useCallback(() => {
    setSearchText(getIdleSearchText(currentPath));
    setSearchMode(false);
    setSearchQuery("");
    setConfirmedResults([]);
    setKeySequence("");
  }, [currentPath]);

  const resetToRootMenu = useCallback(() => {
    resetMenuState();

    for (let index = 0; index < navigationDepth; index++) {
      pop();
    }
  }, [navigationDepth, pop, resetMenuState]);

  const navigateToPath = useCallback(
    (nextPath: string[]) => {
      resetMenuState();

      const isCurrentPath =
        currentPath.length === nextPath.length &&
        currentPath.every((id, index) => id === nextPath[index]);

      if (isCurrentPath) {
        return;
      }

      push(
        <LeaderKeyMenu
          config={config}
          isLoading={isLoading}
          currentPath={nextPath}
          navigationDepth={navigationDepth + 1}
          layoutMode={layoutMode}
          keyboardLayoutSize={keyboardLayoutSize}
          onConfigUpdate={onConfigUpdate}
          onConfigReload={onConfigReload}
          onLayoutModeChange={onLayoutModeChange}
          onKeyboardLayoutSizeChange={onKeyboardLayoutSizeChange}
        />,
      );
    },
    [
      config,
      currentPath,
      isLoading,
      layoutMode,
      keyboardLayoutSize,
      navigationDepth,
      onConfigReload,
      onConfigUpdate,
      onKeyboardLayoutSizeChange,
      onLayoutModeChange,
      push,
      resetMenuState,
    ],
  );

  const handleToggleLayoutMode = useCallback(async () => {
    const nextLayoutMode =
      layoutMode === "dual-column" ? "single-column" : "dual-column";

    onLayoutModeChange(nextLayoutMode);
    await LocalStorage.setItem(LAYOUT_MODE_STORAGE_KEY, nextLayoutMode);
    await showToast({
      style: Toast.Style.Success,
      title:
        nextLayoutMode === "dual-column"
          ? "Keyboard layout shown"
          : "Keyboard layout hidden",
    });
  }, [layoutMode, onLayoutModeChange]);

  const handleKeyboardLayoutSizeChange = useCallback(
    async (size: KeyboardLayoutSize) => {
      onKeyboardLayoutSizeChange(size);
      await LocalStorage.setItem(KEYBOARD_LAYOUT_SIZE_STORAGE_KEY, size);
      await showToast({
        style: Toast.Style.Success,
        title: "Keyboard layout size updated",
        message: KEYBOARD_LAYOUT_SIZE_LABELS[size],
      });
    },
    [onKeyboardLayoutSizeChange],
  );

  const handleAddItem = useCallback(
    (itemType: "action" | "group") => {
      if (!config) {
        return;
      }

      push(
        <AddItemForm
          config={config}
          parentPath={currentPath}
          itemType={itemType}
          onSave={async (newConfig) => {
            await saveConfig(newConfig);
            onConfigUpdate(newConfig);
          }}
        />,
      );
    },
    [config, currentPath, onConfigUpdate, push],
  );

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
      onConfigUpdate(newConfig);
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
      await onConfigReload();
      resetToRootMenu();
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration cleared",
        message: "All shortcuts have been deleted",
      });
    }
  }

  const breadcrumb = getBreadcrumb(config, currentPath);

  const currentGroup = config
    ? currentPath.length === 0
      ? config
      : findGroupByPath(config, currentPath)
    : null;

  const items = currentGroup?.actions || [];
  const groupedItems = groupAndSortItems(items);
  const isShowingKeyboardLayout = layoutMode === "dual-column";
  const getKeyboardLayoutMarkdown = useCallback(
    (selectedKey?: string) =>
      renderKeyboardLayoutMarkdown(items, {
        appearance: environment.appearance,
        selectedKey,
        size: keyboardLayoutSize,
        title: breadcrumb || "Root",
      }),
    [breadcrumb, items, keyboardLayoutSize],
  );

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
      resetToRootMenu();
    }, timeoutMs);
  }, [resetToRootMenu]);

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
            navigateToPath(exactMatch.path);
          } else {
            const browser = resolveBrowser(config!, exactMatch.path);
            executeAction(
              exactMatch.item as ActionItem,
              resetToRootMenu,
              browser,
            );
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
      const visibleText = getVisibleSearchText(text);

      if (isClearingGroupNavigationGuard(text, currentPath)) {
        pop();
        return;
      }

      if (!visibleText || !currentGroup) {
        return;
      }

      if (visibleText.length === 1) {
        const matchingItem = currentGroup.actions.find(
          (item) => item.key === visibleText,
        );

        if (matchingItem) {
          if (isGroup(matchingItem)) {
            navigateToPath(getChildPath(currentPath, matchingItem.id));
          } else {
            const browser = resolveBrowser(config!, [
              ...currentPath,
              matchingItem.id,
            ]);
            executeAction(matchingItem, resetToRootMenu, browser);
          }
        } else {
          setSearchText(getIdleSearchText(currentPath));
          showToast({
            style: Toast.Style.Failure,
            title: "No action assigned",
            message: `Key "${visibleText}" is not bound to any action`,
          });
        }
      } else {
        setSearchText(getIdleSearchText(currentPath));
      }
    },
    [
      config,
      confirmedResults,
      currentGroup,
      currentPath,
      navigateToPath,
      pop,
      resetTimeout,
      resetToRootMenu,
      searchMode,
    ],
  );

  const handleEnterSearchMode = useCallback(() => {
    setSearchMode(true);
    setSearchQuery("");
    setSearchText("");
  }, []);

  const handleExitSearchMode = useCallback(() => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchText(getIdleSearchText(currentPath));
    setConfirmedResults([]);
    setKeySequence("");
  }, [currentPath]);

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

  const handleExecuteConfirmedResult = useCallback(
    (result: SearchResult) => {
      setConfirmedResults([]);
      setKeySequence("");
      setSearchText("");
      setSearchMode(false);

      if (isGroup(result.item)) {
        navigateToPath(result.path);
      } else {
        const browser = resolveBrowser(config!, result.path);
        executeAction(result.item as ActionItem, resetToRootMenu, browser);
      }
    },
    [config, navigateToPath, resetToRootMenu],
  );

  const handleSelectSearchResult = useCallback(
    (result: SearchResult) => {
      navigateToPath(getSearchSelectionPath(result.path, isGroup(result.item)));
    },
    [navigateToPath],
  );

  const handleGoToParentGroup = useCallback(
    (result: SearchResult) => {
      navigateToPath(getParentPath(result.path));
    },
    [navigateToPath],
  );

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
      return `${breadcrumb} → Input a key | Backspace to parent | Tab to search`;
    }
    return "Input a key | Tab to search";
  };

  if (confirmedResults.length > 0 && config) {
    return (
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={handleSearchChange}
        searchBarPlaceholder={getPlaceholder()}
        navigationTitle={breadcrumb || "Leader Key"}
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
        navigationTitle={breadcrumb || "Leader Key"}
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
      isShowingDetail={isShowingKeyboardLayout}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder={getPlaceholder()}
      navigationTitle={breadcrumb || "Leader Key"}
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
                  navigateToPath(getChildPath(currentPath, item.id));
                } else {
                  const browser = resolveBrowser(config!, [
                    ...currentPath,
                    item.id,
                  ]);
                  executeAction(item, resetToRootMenu, browser);
                }
              }}
              onDelete={() => handleDelete(item, [...currentPath, item.id])}
              onConfigUpdate={onConfigUpdate}
              onClearConfig={handleClearConfig}
              onEnterSearchMode={handleEnterSearchMode}
              onAddAction={() => handleAddItem("action")}
              onAddGroup={() => handleAddItem("group")}
              layoutMode={layoutMode}
              keyboardLayoutSize={keyboardLayoutSize}
              keyboardLayoutMarkdown={
                isShowingKeyboardLayout
                  ? getKeyboardLayoutMarkdown(item.key)
                  : undefined
              }
              keyboardLayoutMetadata={
                isShowingKeyboardLayout
                  ? renderKeyboardLayoutMetadata(items, item.key)
                  : undefined
              }
              onToggleLayoutMode={handleToggleLayoutMode}
              onKeyboardLayoutSizeChange={handleKeyboardLayoutSizeChange}
              onActionComplete={resetToRootMenu}
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
              <KeyboardLayoutToggleAction
                layoutMode={layoutMode}
                onToggle={handleToggleLayoutMode}
              />
              <KeyboardLayoutSizeSubmenu
                currentSize={keyboardLayoutSize}
                onChange={handleKeyboardLayoutSizeChange}
              />
              <Action
                title="Add Action"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => handleAddItem("action")}
              />
              <Action
                title="Add Group"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={() => handleAddItem("group")}
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
    return getActionItemIcon(actionItem);
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
    return getActionItemIcon(actionItem);
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
  onDelete,
  onConfigUpdate,
  onClearConfig,
  onEnterSearchMode,
  onAddAction,
  onAddGroup,
  layoutMode,
  keyboardLayoutSize,
  keyboardLayoutMarkdown,
  keyboardLayoutMetadata,
  onToggleLayoutMode,
  onKeyboardLayoutSizeChange,
  onActionComplete,
  push,
}: {
  item: ActionOrGroup;
  config: RootConfig;
  currentPath: string[];
  onSelect: () => void;
  onDelete: () => void;
  onConfigUpdate: (config: RootConfig) => void;
  onClearConfig: () => void;
  onEnterSearchMode: () => void;
  onAddAction: () => void;
  onAddGroup: () => void;
  layoutMode: LayoutMode;
  keyboardLayoutSize: KeyboardLayoutSize;
  keyboardLayoutMarkdown?: string;
  keyboardLayoutMetadata?: KeyboardLayoutMetadataRow[];
  onToggleLayoutMode: () => void;
  onKeyboardLayoutSizeChange: (size: KeyboardLayoutSize) => void;
  onActionComplete: () => void;
  push: NavigationPush;
}) {
  const isGroupItem = isGroup(item);
  const actionItem = item as ActionItem;

  function getItemIcon() {
    if (isGroupItem) {
      return Icon.Folder;
    }
    return getActionItemIcon(actionItem);
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
      detail={
        keyboardLayoutMarkdown ? (
          <KeyboardLayoutDetail
            markdown={keyboardLayoutMarkdown}
            metadata={keyboardLayoutMetadata}
          />
        ) : undefined
      }
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
          <KeyboardLayoutToggleAction
            layoutMode={layoutMode}
            onToggle={onToggleLayoutMode}
          />
          <KeyboardLayoutSizeSubmenu
            currentSize={keyboardLayoutSize}
            onChange={onKeyboardLayoutSizeChange}
          />
          {!isGroupItem && actionItem.type === "url" && (
            <OpenWithBrowserSubmenu
              action={actionItem}
              defaultBrowser={resolveBrowser(config, [...currentPath, item.id])}
              onComplete={onActionComplete}
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
              onAction={onAddAction}
            />
            <Action
              title="Add Group"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              onAction={onAddGroup}
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

function KeyboardLayoutDetail({
  markdown,
  metadata,
}: {
  markdown: string;
  metadata?: KeyboardLayoutMetadataRow[];
}) {
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        metadata && metadata.length > 0 ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Information" />
            {metadata.map((row) => (
              <List.Item.Detail.Metadata.Label
                key={row.title}
                title={row.title}
                text={row.text}
              />
            ))}
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function KeyboardLayoutToggleAction({
  layoutMode,
  onToggle,
}: {
  layoutMode: LayoutMode;
  onToggle: () => void;
}) {
  const isDualColumn = layoutMode === "dual-column";

  return (
    <Action
      title={isDualColumn ? "Hide Keyboard Layout" : "Show Keyboard Layout"}
      icon={Icon.Keyboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
      onAction={onToggle}
    />
  );
}

function KeyboardLayoutSizeSubmenu({
  currentSize,
  onChange,
}: {
  currentSize: KeyboardLayoutSize;
  onChange: (size: KeyboardLayoutSize) => void;
}) {
  const sizes: KeyboardLayoutSize[] = ["compact", "default", "large"];

  return (
    <ActionPanel.Submenu title="Keyboard Layout Size" icon={Icon.Keyboard}>
      {sizes.map((size) => (
        <Action
          key={size}
          title={KEYBOARD_LAYOUT_SIZE_LABELS[size]}
          icon={size === currentSize ? Icon.Check : undefined}
          onAction={() => onChange(size)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function OpenWithBrowserSubmenu({
  action,
  defaultBrowser,
  onComplete,
}: {
  action: ActionItem;
  defaultBrowser?: string;
  onComplete: () => void;
}) {
  const [applicationGroups, setApplicationGroups] =
    useState<OpenWithApplicationGroups>({
      recommended: [],
      others: [],
    });
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  async function loadApplications() {
    if (hasLoaded || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const applications = await getApplications();
      applications.sort((a, b) => a.name.localeCompare(b.name));
      setApplicationGroups(await groupApplicationsForOpenWith(applications));
      setHasLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Applications",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ActionPanel.Submenu
      title="Open with"
      icon={Icon.Globe}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      onOpen={() => {
        void loadApplications();
      }}
    >
      <ActionPanel.Section title="Default">
        <Action
          title="Default"
          icon={Icon.Globe}
          onAction={() => executeAction(action, onComplete, defaultBrowser)}
        />
      </ActionPanel.Section>
      {applicationGroups.recommended.length > 0 && (
        <ActionPanel.Section title="Recommended">
          {applicationGroups.recommended.map((application) => (
            <OpenWithApplicationAction
              key={application.bundleId || application.path}
              application={application}
              action={action}
              onComplete={onComplete}
            />
          ))}
        </ActionPanel.Section>
      )}
      {applicationGroups.others.length > 0 && (
        <ActionPanel.Section title="Others">
          {applicationGroups.others.map((application) => (
            <OpenWithApplicationAction
              key={application.bundleId || application.path}
              application={application}
              action={action}
              onComplete={onComplete}
            />
          ))}
        </ActionPanel.Section>
      )}
    </ActionPanel.Submenu>
  );
}

function OpenWithApplicationAction({
  application,
  action,
  onComplete,
}: {
  application: Application;
  action: ActionItem;
  onComplete: () => void;
}) {
  return (
    <Action
      title={application.name}
      icon={{ fileIcon: application.path }}
      onAction={() =>
        executeAction(action, onComplete, application.path, {
          skipActiveBrowserResolution: true,
        })
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

function getActionItemIcon(action: ActionItem) {
  if (action.type === "application") {
    return { fileIcon: action.value };
  }

  if (action.type === "url") {
    const customIcon = getCustomActionIcon(action.icon);
    if (customIcon) {
      return customIcon;
    }

    const faviconUrl = getFaviconUrl(action.value);
    return faviconUrl
      ? { source: faviconUrl, fallback: Icon.Globe }
      : getActionIcon(action.type);
  }

  return getActionIcon(action.type);
}

function getCustomActionIcon(value: unknown) {
  const icon = normalizeCustomIconValue(value);
  if (!icon) {
    return undefined;
  }

  const normalizedIconName = normalizeIconName(icon);
  const builtInIcon = Object.entries(Icon).find(
    ([name]) => normalizeIconName(name) === normalizedIconName,
  )?.[1];

  return builtInIcon || icon;
}

function normalizeIconName(value: string): string {
  return value
    .replace(/^Icon\./i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
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
  url: "URLs/Deeplinks",
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
