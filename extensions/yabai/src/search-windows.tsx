import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { runYabaiCommand } from "./helpers/scripts";
import { execaCommand } from "execa";
import { sortWindows, BaseWindow } from "./helpers/window-utils";
import * as pinyin from "tiny-pinyin";

interface Window extends BaseWindow {
  icon?: string;
}

async function findAppPath(pid: number): Promise<string> {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("Invalid process ID");
  }
  const { stdout, stderr } = await execaCommand(`/usr/sbin/lsof -p ${pid} | grep txt | grep -v DEL | head -n 1 `, {
    shell: true,
  });
  if (stderr) {
    console.error(stderr);
    return "";
  }
  const beginIndex = stdout.indexOf("/");
  const appIndex = stdout.indexOf(".app");
  if (appIndex === -1) {
    return stdout;
  }
  return stdout.substring(beginIndex, appIndex + 4);
}

function getPinyin(text: string): string {
  if (!/[\u4e00-\u9fa5]/.test(text)) {
    return text.toLowerCase();
  }
  return pinyin.convertToPinyin(text, "", true).toLowerCase();
}

function timeLog(label: string, startTime: number) {
  const endTime = performance.now();
  console.debug(`${label}: ${endTime - startTime}ms`);
}

export default function Command() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredWindows, setFilteredWindows] = useState<Window[]>([]);
  const [searchText, setSearchText] = useState("");

  const filteredWindowsMemo = useMemo(() => {
    const startTime = performance.now();

    if (!searchText) {
      timeLog("Filter (no search)", startTime);
      return windows;
    }

    const lowerSearchText = searchText.toLowerCase();

    const results = windows.filter((window) => {
      const filterStartTime = performance.now();

      if (window.title.toLowerCase().includes(lowerSearchText) || window.app.toLowerCase().includes(lowerSearchText)) {
        timeLog("Filter (text match)", filterStartTime);
        return true;
      }

      if (/^[a-z]+$/.test(lowerSearchText)) {
        const pinyinStartTime = performance.now();
        const titlePinyin = getPinyin(window.title);
        const appPinyin = getPinyin(window.app);
        const matched = titlePinyin.includes(lowerSearchText) || appPinyin.includes(lowerSearchText);
        timeLog("Filter (pinyin match)", pinyinStartTime);
        return matched;
      }

      timeLog("Filter (no match)", filterStartTime);
      return false;
    });

    timeLog("Total filter time", startTime);
    return results;
  }, [windows, searchText]);

  useEffect(() => {
    async function fetchWindows() {
      const startTime = performance.now();
      try {
        const { stdout, stderr } = await runYabaiCommand("-m query --windows");
        if (stderr) {
          throw new Error(stderr);
        }
        const windowsData: Window[] = JSON.parse(stdout);

        const sortedWindows = sortWindows(windowsData);

        timeLog("Fetch windows data", startTime);

        const iconStartTime = performance.now();
        const windowsWithIcons = await Promise.all(
          sortedWindows.map(async (window) => ({
            ...window,
            icon: await findAppPath(window.pid),
          })),
        );
        timeLog("Add icons", iconStartTime);

        setWindows(windowsWithIcons);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch windows");
      } finally {
        setIsLoading(false);
        timeLog("Total fetch time", startTime);
      }
    }

    fetchWindows();
  }, []);

  useEffect(() => {
    setFilteredWindows(filteredWindowsMemo);
  }, [filteredWindowsMemo]);

  async function focusWindow(windowId: number) {
    try {
      const { stderr } = await runYabaiCommand(`-m window --focus ${windowId}`);
      if (stderr) {
        throw new Error(stderr);
      }
      showToast(Toast.Style.Success, "Window focused");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to focus window");
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search windows by name or pinyin..."
      onSearchTextChange={setSearchText}
    >
      {filteredWindows.map((window) => (
        <List.Item
          key={window.id}
          icon={{ fileIcon: window.icon || window.app }}
          title={window.app}
          subtitle={window.title}
          accessories={[{ text: `Space ${window.space}` }]}
          actions={
            <ActionPanel>
              <Action title="Focus Window" onAction={() => focusWindow(window.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
