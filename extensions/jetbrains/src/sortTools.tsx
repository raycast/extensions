import { List, ActionPanel, Action, popToRoot, showToast, Toast } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { AppHistory } from "./util";
import { usePreferences } from "raycast-hooks";
import { loadAppEntries, getHistory } from "./util";

interface SortToolsProps {
  tools: AppHistory[];
  sortOrder: string;
  saveSortOrder: (currentOrder: string) => void;
  pop?: () => void;
}

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

export function SortTools({ tools, sortOrder, saveSortOrder, pop }: SortToolsProps): JSX.Element {
  const [order, setOrder] = useState<string[]>(sortOrder.split(","));
  useEffect(() => {
    setOrder(sortOrder.split(","));
  }, [sortOrder]);
  const save = useCallback(() => {
    saveSortOrder(order.join(","));
    pop ? pop() : popToRoot().then(() => showToast(Toast.Style.Success, "Saved"));
  }, [saveSortOrder, pop, order]);
  if (tools.length === 0) {
    return <List navigationTitle="Choose Application Sort Order" isLoading />;
  }
  console.log({ order, sortOrder });
  return (
    <List
      navigationTitle="Choose Application Sort Order"
      enableFiltering={false}
      searchBarPlaceholder="Sort and save application order"
    >
      <List.Section title="Choose Order" subtitle={`⌃+S to save${pop ? " – ⌃+C to cancel" : ""}`}>
        {tools.sort(sortTools(order)).map((tool, id) => (
          <List.Item
            key={tool.title}
            title={tool.title}
            icon={tool.icon}
            accessories={[{ text: "k move up" }, { text: "j move down" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Move Up"
                  shortcut={{ modifiers: [], key: "k" }}
                  onAction={() => setOrder(move(id, "UP", order))}
                />
                <Action
                  title="Move Down"
                  shortcut={{ modifiers: [], key: "j" }}
                  onAction={() => setOrder(move(id, "DOWN", order))}
                />
                <Action title="Save" shortcut={{ modifiers: ["ctrl"], key: "s" }} onAction={save} />
                {pop && <Action title="Cancel" shortcut={{ modifiers: ["ctrl"], key: "c" }} onAction={pop} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function SortToolsCommand() {
  const [tools, setTools] = useState<AppHistory[]>();
  const [{ sortOrder }, prefActions] = usePreferences({ sortOrder: "" });
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
    />
  );
}
