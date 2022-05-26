import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { getIpTime } from "./hooks/hooks";
import { isEmpty } from "./utils/common-utils";

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
      <List.EmptyView title={emptyViewTitle()} icon={Icon.Clock} />
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
