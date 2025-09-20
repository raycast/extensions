import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, LaunchType, List } from "@raycast/api";
import { createDeeplink, DeeplinkType, showFailureToast, usePromise } from "@raycast/utils";
import React, { useEffect } from "react";
import { fetchMenuBarDetail } from "./api";
import { ClearCacheItem, PinActionsSection, ResetRanking } from "./components";
import { CLICK_TYPE_DISPLAY_NAME, ORDERED_CLICK_TYPES } from "./constants";
import { PinnedFunctions, usePinnedMenuBarIds, useSearchCommandPreferencesValidation } from "./hooks";
import { PerformMenuBarCommandLaunchContext } from "./perform-menu-bar-command";
import { ActionType, MenuBarDetail } from "./types";
import { getIconFromMenuBarDetail, handlePerformMenuBarAction } from "./utils";

function getOrderedActions(): ActionType[] {
  const { primaryAction, secondaryAction } = getPreferenceValues<Preferences.SearchMenuBarApps>();
  const rest = ORDERED_CLICK_TYPES.filter((action) => action !== primaryAction && action !== secondaryAction);

  // Handle case where primary and secondary actions are the same
  if (primaryAction === secondaryAction) {
    return [primaryAction, ...rest];
  }
  return [primaryAction, secondaryAction, ...rest];
}

function MenuBarQuickLinkAction({ actionType, menuBarClick }: { actionType: ActionType; menuBarClick: MenuBarDetail }) {
  const displayName = CLICK_TYPE_DISPLAY_NAME[actionType];
  return (
    <Action.CreateQuicklink
      key={actionType}
      title={`Create ${displayName} Quick Link`}
      icon={Icon.Link}
      quicklink={{
        name: `${displayName} ${menuBarClick.name || menuBarClick.menuBarId}`,
        link: createDeeplink({
          type: DeeplinkType.Extension,
          command: "perform-menu-bar-command",
          launchType: LaunchType.Background,
          fallbackText: menuBarClick.name,
          context: {
            type: "menuBarClick",
            menuBarId: menuBarClick.menuBarId,
            actionType,
          } satisfies PerformMenuBarCommandLaunchContext,
        }),
      }}
    />
  );
}

function ClickActionsSection({
  result,
  visitItem,
  isRunning,
}: {
  result: MenuBarDetail;
  visitItem: (item: string) => Promise<void>;
  isRunning: boolean;
}) {
  const orderedActions = getOrderedActions();
  const shortcuts: (Keyboard.Shortcut | undefined)[] = [
    undefined,
    undefined,
    { modifiers: ["opt"], key: "return" },
    { modifiers: ["cmd", "shift"], key: "return" },
    { modifiers: ["opt", "shift"], key: "return" },
    { modifiers: ["ctrl", "shift"], key: "return" },
  ];

  const handleAction = async (actionType: ActionType) => {
    if (!isRunning) {
      await showFailureToast(`The menu bar item "${result.name || result.menuBarId}" is not currently running.`, {
        title: "Cannot Execute Action",
      });
      return;
    }
    await handlePerformMenuBarAction(result.menuBarId, actionType);
    await visitItem(result.menuBarId);
  };

  return (
    <ActionPanel.Section>
      {orderedActions.map((actionType, index) => (
        <Action
          key={actionType}
          title={CLICK_TYPE_DISPLAY_NAME[actionType]}
          icon={Icon.Mouse}
          shortcut={index < shortcuts.length ? shortcuts[index] : undefined}
          onAction={() => handleAction(actionType)}
        />
      ))}
    </ActionPanel.Section>
  );
}

function QuickLinksSection({ result }: { result: MenuBarDetail }) {
  const orderedActions = getOrderedActions();

  return (
    <ActionPanel.Section>
      {orderedActions.map((actionType) => (
        <MenuBarQuickLinkAction key={actionType} actionType={actionType} menuBarClick={result} />
      ))}
    </ActionPanel.Section>
  );
}

function SearchListItem(
  props: {
    menuBarId: string;
    isPinned: boolean;
    visitItem: (item: string) => Promise<void>;
    resetRanking: (item: string) => Promise<void>;
    clearCache: () => void;
    isRunning: (menuBarId: string) => boolean;
  } & PinnedFunctions,
) {
  const { data } = usePromise(fetchMenuBarDetail, [props.menuBarId]);
  const isRunning = props.isPinned ? props.isRunning(props.menuBarId) : true;

  return (
    <List.Item
      /* This is necessary to prevent a stuck Loading... state for first element in Node dev mode */
      key={data ? "loaded" : "loading"}
      title={data ? data.name || "Unknown Name" : "Loading..."}
      icon={getIconFromMenuBarDetail(data?.icon)}
      subtitle={props.menuBarId}
      keywords={!data?.name?.trim() ? [props.menuBarId] : undefined}
      accessories={
        props.isPinned
          ? [
              {
                icon: isRunning ? { source: Icon.CheckCircle, tintColor: "green" } : Icon.Circle,
                tooltip: isRunning ? "Running" : "Not Running",
              },
            ]
          : []
      }
      actions={
        data && (
          <ActionPanel>
            <ClickActionsSection result={data} visitItem={props.visitItem} isRunning={isRunning} />
            <PinActionsSection item={data.menuBarId} isPinned={props.isPinned} pinnedFunctions={props} />
            <ActionPanel.Section>
              <Action.CopyToClipboard
                /* eslint-disable-next-line @raycast/prefer-title-case */
                title="Copy ID"
                content={data.menuBarId}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              {data.name && (
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={data.name}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              )}
              {data.icon?.type === "app" && (
                <Action.CopyToClipboard
                  title="Copy App Path"
                  content={data.icon.path}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
              )}
            </ActionPanel.Section>
            <QuickLinksSection result={data} />
            <ActionPanel.Section>
              <ResetRanking onAction={() => props.resetRanking(props.menuBarId)} />
              <ClearCacheItem clearCache={props.clearCache} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}

export default function Command() {
  useSearchCommandPreferencesValidation();
  const { pinned, unpinned, isLoading, isRunning, error, clearCache, visitItem, resetRanking, pinnedFunctions } =
    usePinnedMenuBarIds();

  useEffect(() => {
    if (error) {
      showFailureToast(error, {
        title: "Failed to load menu bar items",
      }).then();
    }
  }, [error]);

  function getSection(type: "pinned" | "unpinned") {
    const items = type === "pinned" ? pinned : unpinned;
    if (!items || items.length === 0) return null;
    const title = type === "pinned" ? "Pinned" : "Unpinned";
    const subtitle = items.length + "";
    return (
      <List.Section title={title} subtitle={subtitle}>
        {items.map((menuBarId) => (
          <SearchListItem
            key={menuBarId}
            menuBarId={menuBarId}
            visitItem={visitItem}
            resetRanking={resetRanking}
            isPinned={type === "pinned"}
            clearCache={clearCache}
            isRunning={isRunning}
            {...pinnedFunctions}
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search menu bar apps..."
      filtering={{ keepSectionOrder: true }}
      actions={
        <ActionPanel>
          <ClearCacheItem clearCache={clearCache} />
        </ActionPanel>
      }
    >
      {getSection("pinned")}
      {getSection("unpinned")}
    </List>
  );
}
