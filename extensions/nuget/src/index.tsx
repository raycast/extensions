import { ActionPanel, List, Action, environment, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import PackageDetail from "./components/package-detail";
import { searchNuget } from "./nuget-client";
import { NugetPackage } from "./NugetPackage";
import { GetCommandForCli, humanizeNumber, randomString } from "./utils";
import { join } from "path";

interface State {
  isLoading: boolean;
  query?: string;
  items?: NugetPackage[];
}

export default function Command(): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true });
  const fetchId = useRef("");

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }

    const newId = randomString(10);

    fetchId.current = newId;

    searchNuget(state.query, newId).then((res) => {
      const _fetchid = res.fetchId;
      if (fetchId.current === _fetchid) {
        setState((oldState) => ({ ...oldState, isLoading: false, items: res.data }));
      }
    });
  }, [state]);

  return (
    <List
      onSearchTextChange={(query: string) => {
        setState((oldState) => ({ ...oldState, query: query, isLoading: true }));
      }}
      isLoading={state.isLoading}
    >
      {!state.isLoading &&
        state.items &&
        state.items.map((item) => {
          return (
            <List.Item
              key={item.id}
              icon={item.iconUrl || join(environment.assetsPath, "icon.png")}
              title={item.title}
              accessories={[
                {
                  text: humanizeNumber(item.totalDownloads),
                  icon: Icon.Download,
                  tooltip: "Total Downloads",
                },
                {
                  text: item.version,
                  icon: Icon.Gear,
                  tooltip: "Latest Version",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" target={<PackageDetail package={item} />} icon={Icon.Sidebar} />
                  <Action.CopyToClipboard title="Copy Install Command" content={GetCommandForCli(item)} />
                  <Action.Paste
                    content={GetCommandForCli(item)}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
