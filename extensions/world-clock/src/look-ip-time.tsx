import { ActionPanel, List, Action } from "@raycast/api";
import React, { useState } from "react";
import { getIpTime } from "./hooks/hooks";
import { ListEmptyView } from "./components/list-empty-view";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";

export default function PopularArticles() {
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
      searchBarPlaceholder={"Look current time via IP or domain"}
      onSearchTextChange={(text) => {
        if (typeof text !== "undefined" && !isEmpty(text.replaceAll(" ", "")))
          setSearchContent(text.replaceAll(" ", ""));
      }}
      throttle={true}
    >
      <ListEmptyView title={emptyViewTitle()} />

      {timeInfo.map((value, index) => {
        return (
          <List.Item
            key={index}
            icon={{ source: { light: "timezone.png", dark: "timezone@dark.png" } }}
            title={value[0]}
            subtitle={value[1]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy ${value[0]}`} content={value[1]} />
                <Action.CopyToClipboard
                  title={`Copy All Info`}
                  content={JSON.stringify(Object.fromEntries(timeInfo), null, 1)}
                />
                <ActionOpenCommandPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
