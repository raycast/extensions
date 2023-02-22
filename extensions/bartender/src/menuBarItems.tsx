import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { Action, ActionPanel, Application, getApplications, Icon, List, showToast, Toast } from "@raycast/api";
import { buildScriptCheckIsBartenderRunning, ClickAction, ClickMenuBarItem, MenuBarItem } from "./utils";
import { ADDITIONAL_INFO, BARTENDER_APPLICATION_NAME, BARTENDER_DISPLAY_NAME, NOT_RUNNING } from "./constants";

function ClickActions(item: MenuBarItem) {
  return (
    <ActionPanel>
      <Action title="Left Click" onAction={() => ClickMenuBarItem(item, ClickAction.LeftClick)} />
      <Action title="Right Click" onAction={() => ClickMenuBarItem(item, ClickAction.RightClick)} />
    </ActionPanel>
  );
}

export default function Command() {
  const [appNameSet, setAppNameSet] = useState(new Set());
  const [appList, setAppList] = useState<Application[]>([]);
  const [menuBarItems, setMenuBarItems] = useState<{ name: string; items: MenuBarItem[] }[]>([]);

  useEffect(() => {
    getApplications().then((result) => {
      console.info("Get applications.");
      const apps: Application[] = [];
      const nameSet = new Set();
      result.map((app) => {
        nameSet.add(app.name);
        apps.push(app);
      });

      // Some manual additional information
      ADDITIONAL_INFO.map((app) => apps.push(app));
      setAppList(apps);
      setAppNameSet(nameSet);
    });
  }, []);

  const script = buildScriptCheckIsBartenderRunning("list menu bar items");
  useEffect(() => {
    runAppleScript(script).then((result) => {
      console.info("Run script.");
      if (appNameSet.size == 0) {
        console.debug("appNameSet.size == 0");
        return;
      }

      if (!appNameSet.has(BARTENDER_APPLICATION_NAME)) {
        showToast({
          title: `❗ ${BARTENDER_DISPLAY_NAME} is not installed.`,
          style: Toast.Style.Failure,
        });
        return;
      }

      if (result === NOT_RUNNING) {
        showToast({
          title: `❗ ${BARTENDER_DISPLAY_NAME} is not running.`,
          style: Toast.Style.Failure,
        });
        return;
      }

      const items = new Map();
      result.split("\n").map((menuItemId) => {
        if (menuItemId === "") {
          return;
        }
        const [id, itemName] = menuItemId.split("-", 2);
        const app = appList.find((app) => app.bundleId !== undefined && id.startsWith(app.bundleId));
        const item = {
          name: app === undefined ? id : app.name,
          menuItemId,
          itemName,
        };

        if (!items.has(item.name)) {
          items.set(item.name, []);
        }
        items.get(item.name)?.push(item);
      });
      const sortedItems: { name: string; items: MenuBarItem[] }[] = Array.from(items, ([name, items]) => {
        return { name, items };
      });
      sortedItems.sort((a, b) => {
        if (a.items.length == b.items.length) {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
        }
        return a.items.length - b.items.length;
      });
      setMenuBarItems(sortedItems);
    });
  }, [appList, appNameSet]);

  return (
    <List navigationTitle="Search Menu Bar Item" searchBarPlaceholder="Search for Menu Bar Item">
      {menuBarItems.map(({ name, items }) => {
        if (items.length == 1) {
          return <List.Item key={name} title={name} icon={Icon.Mouse} actions={ClickActions(items[0])} />;
        } else {
          return (
            <List.Section key={name} title={name}>
              {items.map((item) => (
                <List.Item key={item.menuItemId} title={item.itemName} icon={Icon.Mouse} actions={ClickActions(item)} />
              ))}
            </List.Section>
          );
        }
      })}
    </List>
  );
}
