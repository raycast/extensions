import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { getIpTime } from "./hooks/hooks";
import { buildDayAndNightIcon, isEmpty } from "./utils/common-utils";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { ListEmptyView } from "./components/list-empty-view";

export default function QueryIpTime() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { timeInfo, loading } = getIpTime(searchContent);

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (timeInfo.length === 0 && !isEmpty(searchContent)) {
      return "Invalid Query";
    }
    return "World Clock";
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Query current time via IP or domain"}
      onSearchTextChange={(text) => {
        if (typeof text !== "undefined") setSearchContent(text.replaceAll(" ", ""));
      }}
      throttle={true}
    >
      <ListEmptyView title={emptyViewTitle()} command={false} extension={true} />
      {timeInfo.map((value, index) => {
        return (
          <List.Item
            key={index}
            icon={{
              source: {
                light: buildDayAndNightIcon(timeInfo[0][1], true),
                dark: buildDayAndNightIcon(timeInfo[0][1], false),
              },
            }}
            title={value[0]}
            subtitle={value[1]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy ${value[0]}`} content={value[1]} />
                <Action.CopyToClipboard
                  title={`Copy All Info`}
                  content={JSON.stringify(Object.fromEntries(timeInfo), null, 1)}
                />
                <ActionOpenCommandPreferences command={false} extension={true} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
