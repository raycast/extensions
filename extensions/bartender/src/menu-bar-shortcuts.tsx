import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { createDeeplink, DeeplinkType, usePromise, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchMenuBarDetail } from "./api";
import { PinActionsSection } from "./components";
import { CreateEditShortcutForm } from "./components/CreateEditShortcutForm";
import { CLICK_TYPE_DISPLAY_NAME } from "./constants";
import { MenuBarShortcut, PinnedFunctions, ShortcutFunctions, useMenuBarIds, usePinnedMenuBarShortcuts } from "./hooks";
import { ShortcutKeyType } from "./types";
import { getIconFromMenuBarDetail, handlePerformMenuBarShortcut } from "./utils";
import ActionStyle = Alert.ActionStyle;

function useValidateDelayPreferences() {
  const { clickDelay: clickDelayStr, keyPressDelay: keyPressDelayStr } =
    getPreferenceValues<Preferences.MenuBarShortcuts>();

  useEffect(() => {
    const errors: string[] = [];

    function validateDelay(value: string, name: string) {
      const parsed = parseInt(value, 10);

      if (isNaN(parsed) || parsed < 0) {
        errors.push(`${name} needs to be greater than or equal to zero. Current value: "${value}"`);
      } else if (value.trim() !== parsed.toString()) {
        errors.push(
          `${name} should only contain whole numbers (no decimals, letters, or symbols). Current value: "${value}"`,
        );
      }
    }

    validateDelay(keyPressDelayStr, "Keypress Delay");
    validateDelay(clickDelayStr, "Click Delay");

    if (errors.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Settings Need Adjustment",
        message: errors.join("\n"),
        primaryAction: {
          title: "Open Preferences",
          onAction: () => {
            openCommandPreferences().then();
          },
        },
      }).then();
    }
  }, [keyPressDelayStr, clickDelayStr]);
}

function getKeySymbol(key: ShortcutKeyType): string {
  switch (key) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    case "return":
      return "↵";
    case "escape":
      return "⎋";
    default:
      return key;
  }
}

type ShortcutListItemProps = {
  shortcut: MenuBarShortcut;
  isPinned: boolean;
  isRunning: boolean;
  shortcutFunctions: ShortcutFunctions;
  pinnedFunctions: PinnedFunctions;
  showDetail: boolean;
  setShowDetail: (show: boolean) => void;
};

function ShortcutListItem({
  shortcut,
  isPinned,
  isRunning,
  shortcutFunctions,
  pinnedFunctions,
  showDetail,
  setShowDetail,
}: ShortcutListItemProps) {
  const { addShortcut, updateShortcut } = shortcutFunctions;
  const { data: menuBarDetail } = usePromise(fetchMenuBarDetail, [shortcut.menuBarId]);

  // Prepare item props based on whether we're showing detail or accessories
  const itemProps: Partial<List.Item.Props> = showDetail
    ? {
        detail: (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {/* Item Information Section */}
                {menuBarDetail?.name && <List.Item.Detail.Metadata.Label title="App Name" text={menuBarDetail.name} />}
                <List.Item.Detail.Metadata.Label title="Menu Bar ID" text={shortcut.menuBarId} />
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={isRunning ? "Running" : "Not Running"}
                  icon={isRunning ? { source: Icon.CheckCircle, tintColor: "green" } : Icon.Circle}
                />

                {/* Action Section */}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Click Type"
                  text={CLICK_TYPE_DISPLAY_NAME[shortcut.actionType]}
                />
                <List.Item.Detail.Metadata.Label
                  title="Key Sequence"
                  text={
                    shortcut.keySequence.length > 0
                      ? shortcut.keySequence.map(getKeySymbol).join("   ")
                      : "No keys configured"
                  }
                />

                {/* Delay Settings Section */}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Click Delay"
                  text={
                    shortcut.customClickDelay !== undefined
                      ? `${shortcut.customClickDelay} ms (Custom)`
                      : "Using default"
                  }
                />
                <List.Item.Detail.Metadata.Label
                  title="Keypress Delay"
                  text={
                    shortcut.customKeypressDelay !== undefined
                      ? `${shortcut.customKeypressDelay} ms (Custom)`
                      : "Using default"
                  }
                />
              </List.Item.Detail.Metadata>
            }
          />
        ),
      }
    : {
        accessories: [
          {
            text: shortcut.keySequence.length > 0 ? shortcut.keySequence.map(getKeySymbol).join(" → ") : "",
          },
          {
            icon: isRunning ? { source: Icon.CheckCircle, tintColor: "green" } : Icon.Circle,
          },
        ],
      };

  return (
    <List.Item
      title={shortcut.name}
      /* This is necessary to prevent a stuck Loading... state for first element in Node dev mode */
      key={menuBarDetail ? "loaded" : "loading"}
      icon={getIconFromMenuBarDetail(menuBarDetail?.icon)}
      keywords={menuBarDetail?.name?.trim() ? [menuBarDetail.name] : undefined}
      {...itemProps}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Execute Shortcut"
              icon={Icon.Play}
              onAction={async () => {
                if (!isRunning) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Cannot Execute Shortcut",
                    message: `The menu bar item "${menuBarDetail?.name || shortcut.menuBarId}" is not currently running.`,
                  });
                  return;
                }
                await handlePerformMenuBarShortcut({
                  ...shortcut,
                });
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Create Shortcut"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<CreateEditShortcutForm type={"create"} addShortcut={addShortcut} />}
            />
            {menuBarDetail && (
              <>
                <Action.Push
                  title="Edit Shortcut"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<CreateEditShortcutForm type={"edit"} {...shortcut} updateShortcut={updateShortcut} />}
                />
                <Action.Push
                  title="Duplicate Shortcut"
                  icon={Icon.Duplicate}
                  shortcut={Keyboard.Shortcut.Common.Duplicate}
                  target={
                    <CreateEditShortcutForm
                      type={"duplicate"}
                      {...shortcut}
                      name={`${shortcut.name} (Copy)`}
                      addShortcut={addShortcut}
                    />
                  }
                />
              </>
            )}
          </ActionPanel.Section>
          <PinActionsSection item={shortcut.name} isPinned={isPinned} pinnedFunctions={pinnedFunctions} />
          <ActionPanel.Section>
            <Action
              title="Toggle Details"
              icon={Icon.AppWindowSidebarLeft}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowDetail(!showDetail)}
            />
            <Action.CopyToClipboard
              title="Copy Deeplink"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
              content={createDeeplink({
                type: DeeplinkType.Extension,
                command: "perform-menu-bar-command",
                context: {
                  type: "shortcut",
                  shortcutName: shortcut.name,
                },
              })}
            />
            <Action.CreateQuicklink
              title="Create Quick Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              quicklink={{
                name: `Execute ${shortcut.name}`,
                link: createDeeplink({
                  type: DeeplinkType.Extension,
                  command: "perform-menu-bar-command",
                  context: {
                    type: "shortcut",
                    shortcutName: shortcut.name,
                  },
                }),
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Shortcut"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                await confirmAlert({
                  title: "Delete Shortcut",
                  message: `Are you sure you want to delete the shortcut? This action cannot be undone.`,
                  icon: Icon.Trash,
                  rememberUserChoice: true,
                  primaryAction: {
                    title: "Delete",
                    style: ActionStyle.Destructive,
                    onAction: async () => {
                      await shortcutFunctions.deleteShortcut(shortcut.name);
                    },
                  },
                });
              }}
            />
            <Action
              title="Delete All"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={async () => {
                await confirmAlert({
                  title: "Delete All Shortcuts",
                  message: `Are you sure you want to delete all shortcuts? This action cannot be undone.`,
                  icon: Icon.Trash,
                  primaryAction: {
                    title: "Delete",
                    style: ActionStyle.Destructive,
                    onAction: async () => {
                      await shortcutFunctions.deleteAllShortcuts();
                    },
                  },
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  useValidateDelayPreferences();
  const [filter, setFilter] = useState<string>("all");
  const [showDetail, setShowDetail] = useCachedState<boolean>("showDetail", true);

  const { isLoading, pinned, unpinned, shortcutFunctions, pinnedFunctions } = usePinnedMenuBarShortcuts();
  const menuBarIdsHook = useMenuBarIds();

  function section(type: "pinned" | "unpinned") {
    const items = type === "pinned" ? pinned : unpinned;
    if (!items || items.length === 0 || !menuBarIdsHook.data || menuBarIdsHook.data.length === 0) {
      return null;
    }
    const data = menuBarIdsHook.data;
    const title = type === "pinned" ? "Pinned" : "Unpinned";

    const filteredItems = filter === "enabled" ? items.filter((shortcut) => data.includes(shortcut.menuBarId)) : items;

    if (filteredItems.length === 0) {
      return null;
    }

    const subtitle = filteredItems.length + "";
    return (
      <List.Section title={title} subtitle={subtitle}>
        {filteredItems.map((shortcut) => (
          <ShortcutListItem
            key={shortcut.name}
            shortcut={shortcut}
            isPinned={type === "pinned"}
            isRunning={data.includes(shortcut.menuBarId)}
            shortcutFunctions={shortcutFunctions}
            pinnedFunctions={pinnedFunctions}
            showDetail={showDetail}
            setShowDetail={setShowDetail}
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List
      isLoading={isLoading || menuBarIdsHook.isLoading}
      isShowingDetail={showDetail}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter shortcuts" onChange={setFilter} storeValue={true} defaultValue="all">
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Enabled Only" value="enabled" icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Shortcut"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateEditShortcutForm type={"create"} addShortcut={shortcutFunctions.addShortcut} />}
          />
        </ActionPanel>
      }
    >
      {section("pinned")}
      {section("unpinned")}
    </List>
  );
}
