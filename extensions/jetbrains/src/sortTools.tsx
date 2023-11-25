import { List, ActionPanel, Action, popToRoot, showToast, Toast, Icon } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { AppHistory } from "./util";
import { usePreferences } from "raycast-hooks";
import { loadAppEntries, getHistory } from "./util";

type dir = "UP" | "DOWN";

export function sortTools(order: string[]): (a: AppHistory, b: AppHistory) => number {
  return function (a: AppHistory, b: AppHistory): number {
    return order.indexOf(a.title) - order.indexOf(b.title);
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
  sortOrder: string;
  saveSortOrder: (currentOrder: string) => void;
  pop?: () => void;
  screenshotMode: boolean;
  toggleScreenshotMode: () => void;
}

export function SortTools({
  tools,
  sortOrder,
  saveSortOrder,
  pop,
  screenshotMode,
  toggleScreenshotMode,
}: SortToolsProps): JSX.Element {
  const [order, setOrder] = useState<string[]>(sortOrder.split(","));

  // update order if sortOrder changes outside
  useEffect(() => {
    if (sortOrder !== order.join(",")) {
      setOrder(sortOrder.split(","));
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

  const save = useCallback(() => {
    saveSortOrder(order.join(","));
    pop ? pop() : popToRoot().then(() => showToast(Toast.Style.Success, "Saved"));
  }, [saveSortOrder, pop, order]);
  if (tools.length === 0) {
    return <List navigationTitle="Choose Application Sort Order" isLoading />;
  }

  return (
    <List navigationTitle="Choose Application Sort Order" filtering={false} searchBarPlaceholder="Sort applications">
      <List.Section
        title="Choose Order"
        subtitle={screenshotMode ? `⌃+S to save${pop ? " – ⌃+C to cancel" : ""}` : undefined}
      >
        {tools.sort(sortTools(order)).map((tool, id) => (
          <List.Item
            key={`${tool.title} ${tool.version}`}
            title={tool.title}
            subtitle={tool.version}
            icon={tool.icon}
            accessories={screenshotMode ? [{ text: "k move up" }, { text: "j move down" }] : []}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Checkmark}
                  title="Save Order"
                  shortcut={{ modifiers: ["ctrl"], key: "s" }}
                  onAction={save}
                />
                {pop && (
                  <Action
                    icon={Icon.XMarkCircle}
                    title="Cancel"
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                    onAction={pop}
                  />
                )}
                <Action
                  title="Move Up"
                  icon={Icon.ChevronUp}
                  shortcut={{ modifiers: [], key: "k" }}
                  onAction={() => setOrder(move(id, "UP", order))}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ChevronDown}
                  shortcut={{ modifiers: [], key: "j" }}
                  onAction={() => setOrder(move(id, "DOWN", order))}
                />
                <Action
                  icon={Icon.Window}
                  title={`Toggle Screenshot Mode ${screenshotMode ? "Off" : "On"}`}
                  onAction={toggleScreenshotMode}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function SortToolsCommand(): JSX.Element {
  const [tools, setTools] = useState<AppHistory[]>();
  const [{ sortOrder, screenshotMode }, prefActions] = usePreferences({ sortOrder: "", screenshotMode: false });
  useEffect(() => {
    const getTools = async () => {
      setTools((await loadAppEntries(await getHistory())).filter((app) => app.entries?.length));
    };
    getTools();
  }, []);
  return (
    <SortTools
      tools={tools ?? []}
      sortOrder={String(sortOrder)}
      saveSortOrder={(sortOrder: string) => prefActions.update("sortOrder", sortOrder)}
      screenshotMode={!!screenshotMode}
      toggleScreenshotMode={() => prefActions.update("screenshotMode", !screenshotMode)}
    />
  );
}
