import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLastOpenTrace,
  getMenuBarItemDebugInfo,
  listMenuBarItems,
  normalizeError,
  useHelperPath,
} from "./helper-client";
import {
  clearCachedMenuBarCatalog,
  readCachedMenuBarCatalog,
  readStaleMenuBarCatalog,
  writeCachedMenuBarCatalog,
} from "./menu-bar-catalog-cache";
import {
  openSelectedMenuBarItem,
  showMenuBarChangedToast,
} from "./menu-bar-opening";
import { displayTitle, itemIcon, openHint } from "./menu-bar-presentation";
import { HelperError, MenuBarItem } from "./menu-bar-types";

export default function Command() {
  const helperPath = useHelperPath();
  const [items, setItems] = useState<MenuBarItem[]>(
    () => readCachedMenuBarCatalog(helperPath) ?? [],
  );
  const [error, setError] = useState<HelperError | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const itemsRef = useRef(items);
  const isCatalogFreshRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void> | undefined>(undefined);

  const applyItems = useCallback((nextItems: MenuBarItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const refresh = useCallback(() => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    isCatalogFreshRef.current = false;

    setIsLoading(true);
    setError(undefined);

    const request = (async () => {
      try {
        const nextItems = await listMenuBarItems(helperPath);
        writeCachedMenuBarCatalog(helperPath, nextItems);
        applyItems(nextItems);
        isCatalogFreshRef.current = true;
      } catch (caughtError) {
        const nextError = normalizeError(caughtError);
        const cachedItems = isTransientCatalogError(nextError)
          ? itemsRef.current.length > 0
            ? itemsRef.current
            : readStaleMenuBarCatalog(helperPath)
          : undefined;

        if (
          nextError.code === "accessibility_permission_required" ||
          nextError.code === "helper_missing"
        ) {
          clearCachedMenuBarCatalog(helperPath);
        }

        applyItems(cachedItems ?? []);
        if (cachedItems?.length) {
          await showToast({
            style: Toast.Style.Failure,
            title: nextError.message ?? "Unable to refresh menu bar items",
            message: nextError.recoverySuggestion,
          });
        } else {
          setError(nextError);
        }
      } finally {
        refreshPromiseRef.current = undefined;
        setIsLoading(false);
      }
    })();
    refreshPromiseRef.current = request;
    return request;
  }, [applyItems, helperPath]);

  const resolveFreshItem = useCallback(
    async (id: string) => {
      if (!isCatalogFreshRef.current) await refresh();
      if (!isCatalogFreshRef.current) return undefined;

      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (!item) {
        await showMenuBarChangedToast();
      }
      return item;
    },
    [refresh],
  );

  const openItem = useCallback(
    async (id: string) => {
      const item = await resolveFreshItem(id);
      if (item) await openSelectedMenuBarItem(helperPath, item, refresh);
    },
    [helperPath, refresh, resolveFreshItem],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (error) {
    return (
      <ErrorView error={error} helperPath={helperPath} onRefresh={refresh} />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search menu bar items...">
      <List.EmptyView
        icon={Icon.CircleDisabled}
        title="No Menu Bar Items Found"
        description="Only items currently exposed through macOS Accessibility can appear here."
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
      {items.map((item) => (
        <MenuBarListItem
          key={item.id}
          helperPath={helperPath}
          item={item}
          onOpen={openItem}
          onRefresh={refresh}
        />
      ))}
    </List>
  );
}

function isTransientCatalogError(error: HelperError) {
  return error.code === "helper_timeout";
}

function MenuBarListItem(props: {
  helperPath: string;
  item: MenuBarItem;
  onOpen: (id: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const { helperPath, item, onOpen, onRefresh } = props;
  const title = displayTitle(item);

  return (
    <List.Item
      title={title}
      icon={itemIcon(item)}
      keywords={
        [item.processName, item.bundleId, item.title].filter(
          Boolean,
        ) as string[]
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Menu"
            icon={Icon.Mouse}
            onAction={() => onOpen(item.id)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
          <ActionPanel.Section title="Diagnostics">
            <Action
              title="Copy Debug Info"
              icon={Icon.Bug}
              onAction={async () => {
                await copyDebugInfo(helperPath, item);
              }}
            />
            <Action
              title="Copy Last Open Trace"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await copyLastOpenTrace(helperPath);
              }}
            />
            <Action.CopyToClipboard title="Copy Identifier" content={item.id} />
            {item.bundleId ? (
              <Action.CopyToClipboard
                title="Copy Bundle Identifier"
                content={item.bundleId}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ErrorView(props: {
  error: HelperError;
  helperPath: string;
  onRefresh: () => void;
}) {
  const { error, helperPath, onRefresh } = props;
  const markdown = [
    `# ${error.message ?? "Unable to List Menu Bar Items"}`,
    "",
    error.recoverySuggestion ??
      "Check that the helper is built and Raycast has Accessibility permission.",
    "",
    "## Helper",
    "",
    `\`${helperPath}\``,
    "",
    "## Notes",
    "",
    "- macOS must grant Accessibility permission to the process running this extension.",
    "- This extension uses public Accessibility APIs only. Items not exposed through Accessibility cannot appear.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
          />
          <Action
            title="Open Accessibility Settings"
            icon={Icon.Gear}
            onAction={() =>
              open(
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
              )
            }
          />
          <Action.CopyToClipboard
            title="Copy Helper Path"
            content={helperPath}
          />
        </ActionPanel>
      }
    />
  );
}

async function copyDebugInfo(helperPath: string, item: MenuBarItem) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Collecting ${displayTitle(item)} debug info`,
  });

  try {
    const debugInfo = await getMenuBarItemDebugInfo(
      helperPath,
      item.id,
      openHint(item),
    );
    await Clipboard.copy(JSON.stringify(debugInfo, null, 2));
    toast.style = Toast.Style.Success;
    toast.title = "Copied debug info";
  } catch (caughtError) {
    const error = normalizeError(caughtError);
    toast.style = Toast.Style.Failure;
    toast.title = error.message ?? "Unable to copy debug info";
    toast.message = error.recoverySuggestion;
  }
}

async function copyLastOpenTrace(helperPath: string) {
  try {
    const trace = await getLastOpenTrace(helperPath);
    await Clipboard.copy(JSON.stringify(trace, null, 2));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied last open trace",
    });
  } catch (caughtError) {
    const error = normalizeError(caughtError);
    await showToast({
      style: Toast.Style.Failure,
      title: error.message ?? "Unable to copy last open trace",
      message: error.recoverySuggestion,
    });
  }
}
