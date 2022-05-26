import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { searchIpGeolocation } from "./hooks/hooks";
import { IpEmptyView } from "./components/ip-empty-view";
import { listIcons } from "./utils/constants";
import { commonPreferences, isEmpty } from "./utils/common-utils";

export default function SearchIpGeolocation() {
  const { language } = commonPreferences();
  const [searchContent, setSearchContent] = useState<string>("");
  const { ipGeolocation, loading } = searchIpGeolocation(language, searchContent.trim());

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (ipGeolocation.length === 0 && !isEmpty(searchContent)) {
      return "Invalid Query";
    }
    return "IP Geolocation";
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search any IP address/domain"}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <IpEmptyView title={emptyViewTitle()} />
      {ipGeolocation.map((value, index) => (
        <List.Item
          key={index}
          icon={{ source: { light: listIcons[index].light, dark: listIcons[index].dark } }}
          title={value[0]}
          subtitle={value[1]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                icon={{ source: { light: listIcons[index].light, dark: listIcons[index].dark } }}
                title={`Copy ${value[0]}`}
                content={value[1]}
              />
              <Action.CopyToClipboard
                title={`Copy All Info`}
                content={JSON.stringify(Object.fromEntries(ipGeolocation), null, 2)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
