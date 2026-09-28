import { List, ActionPanel, Action, popToRoot, showToast, Toast, Icon, Keyboard, captureException } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { AppHistory, isWin, symbolFromChar, symbolFromMod } from "./util";
import { useLocalStorage } from "@raycast/utils";
import { useAppHistory } from "./useAppHistory";

type dir = "UP" | "DOWN";

export function sortTools(order: string[]): (a: AppHistory, b: AppHistory) => number {
  return function (a: AppHistory, b: AppHistory): number {
    return order.indexOf(a.channelId) - order.indexOf(b.channelId);
  };
}

function move(from: number, dir: dir, list: string[]) {
  const to = dir === "UP" ? from - 1 : from + 1;
  if (to < 0 || to > list.length) {
    return list;
  }
  return from < to
    ? [...list.slice(0, from), ...list.slice(from + 1, to + 1), list[from], ...list.slice(to + 1)]
    : [...list.slice(0, to), list[from], ...list.slice(to, from), ...list.slice(from + 1)];
}

interface SortToolsProps {
  tools: AppHistory[];
  sortOrder: string[];
  saveSortOrder: (currentOrder: string[]) => Promise<void>;
  pop?: () => void;
  screenshotMode: boolean;
  toggleScreenshotMode?: () => void;
}

export function SortTools({
  tools,
  sortOrder,
  saveSortOrder,
  pop,
  screenshotMode,
  toggleScreenshotMode,
}: SortToolsProps): React.JSX.Element {
  const [order, setOrder] = useState<string[]>(sortOrder);

  // update order if sortOrder changes outside
  useEffect(() => {
    if (sortOrder.join(",") !== order.join(",")) {
      setOrder(sortOrder);
    }
  }, [sortOrder]);

  // if order length does not match tools length we need to fix order contents
  useEffect(() => {
    if (order.length !== tools.length || String(order) === "") {
      const defaultOrder =
        String(order) === ""
          ? tools.map((tool) => tool.title).sort()
          : tools.sort(sortTools(order)).map((tool) => tool.title);
      setOrder(defaultOrder);
    }
  }, []);

  const save = useCallback(async () => {
    await saveSortOrder(order);
    if (pop) {
      pop();
    } else {
      await popToRoot().then(() => showToast(Toast.Style.Success, "Saved"));
    }
  }, [saveSortOrder, pop, order]);
  if (tools.length === 0) {
    return <List navigationTitle="Choose Application Sort Order" isLoading />;
  }

  return (
    <List navigationTitle="Choose Application Sort Order" filtering={false} searchBarPlaceholder="Sort applications">
      <List.Section
        title="Choose Order"
        subtitle={
          screenshotMode
            ? `${isWin ? "Ctrl+S" : "⌃+S"} to save${pop ? ` – ${isWin ? "Ctrl+C" : "⌃+C"} to cancel` : ""}`
            : undefined
        }
      >
        {tools.sort(sortTools(order)).map((tool, id) => (
          <List.Item
            key={`${tool.title} ${tool.version}`}
            title={tool.title}
            icon={tool.icon}
            accessories={
              screenshotMode
                ? [
                    { text: "move up/down" },
                    {
                      tag: [symbolFromMod("cmd"), symbolFromMod("shift"), symbolFromChar("arrowUp")].join(" + "),
                    },
                    {
                      tag: [symbolFromMod("cmd"), symbolFromMod("shift"), symbolFromChar("arrowDown")].join(" + "),
                    },
                  ]
                : []
            }
            actions={
              <ActionPanel>
                <Action icon={Icon.CheckCircle} title="Save Order" onAction={save} />
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Move Up"
                  icon={Icon.ChevronUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={() => setOrder(move(id, "UP", order))}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ChevronDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={() => setOrder(move(id, "DOWN", order))}
                />
                {toggleScreenshotMode && (
                  <Action
                    icon={Icon.Window}
                    title={screenshotMode ? "Toggle Screenshot Mode off" : "Toggle Screenshot Mode on"}
                    onAction={toggleScreenshotMode}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function SortToolsCommand(): React.JSX.Element {
  const { sortOrder, setSortOrder, appHistory } = useAppHistory();
  const { value: screenshotMode = false, setValue: setScreenshotMode } = useLocalStorage<boolean>(
    "screenshotMode",
    false,
  );
  return (
    <SortTools
      tools={appHistory}
      sortOrder={sortOrder}
      saveSortOrder={setSortOrder}
      screenshotMode={!!screenshotMode}
      toggleScreenshotMode={() => setScreenshotMode(!screenshotMode).catch((err) => captureException(err))}
    />
  );
}
