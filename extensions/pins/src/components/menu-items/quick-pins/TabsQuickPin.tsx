import { Application, Icon, MenuBarExtra } from "@raycast/api";
import { TabRef } from "../../../lib/LocalData";
import { utils } from "placeholders-toolkit";
import { Group, createNewGroup } from "../../../lib/Groups";
import { createNewPin } from "../../../lib/Pins";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { useCachedState } from "@raycast/utils";

type TabsQuickPinProps = {
  /**
   * The application that is currently open.
   */
  app: Application;

  /**
   * The tabs that are currently open in the frontmost browser.
   */
  tabs: TabRef[];

  /**
   * The list of all pin groups.
   */
  groups: Group[];
};

/**
 * A menu bar extra item that creates a new pin for each tab in the frontmost browser.
 * @returns A menu bar extra item, or null if the current application is not a supported browser or no tabs are open.
 */
export default function TabsQuickPin(props: TabsQuickPinProps) {
  const { app, tabs, groups } = props;
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (!utils.SupportedBrowsers.find((b) => b.name == app.name) || tabs.length == 0) {
    return null;
  }

  let title = `Pin All Tabs (${tabs.length})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.AppWindowGrid3x3}
      tooltip="Create a new pin for each tab in the current browser window, pinned to a new group"
      shortcut={KEYBOARD_SHORTCUT.PIN_ALL_TABS}
      onAction={async () => {
        let newGroupName = "New Tab Group";
        if (targetGroup) {
          newGroupName = targetGroup.name;
        } else {
          let iter = 2;
          while (groups.map((group) => group.name).includes(newGroupName)) {
            newGroupName = `New Tab Group (${iter})`;
            iter++;
          }
          await createNewGroup({
            name: newGroupName,
            icon: "app-window-grid-3x3-16",
          });
        }
        for (const tab of tabs) {
          await createNewPin({
            name: tab.name,
            url: tab.url,
            application: app.name,
            group: newGroupName,
          });
        }
      }}
    />
  );
}
