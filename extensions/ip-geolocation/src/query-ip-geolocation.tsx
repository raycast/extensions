import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { IpEmptyView } from "./components/ip-empty-view";
import { isEmpty } from "./utils/common-utils";
import { ipListIcons } from "./utils/constants";
import { useIpGeolocation } from "./hooks/useIpGeolocation";

interface IpArgument {
  ipAddress: string;
}

export default function QueryIpGeolocation(props: { arguments: IpArgument }) {
  const { ipAddress } = props.arguments;
  const [searchContent, setSearchContent] = useState<string>(ipAddress ? ipAddress.trim() : "");
  const { data, isLoading } = useIpGeolocation(searchContent);

  const ipGeolocation = useMemo(() => {
    return data || [];
  }, [data]);

  const emptyViewTitle = () => {
    if (isLoading) {
      return "Loading...";
    }
    if (ipGeolocation.length === 0 && !isEmpty(searchContent)) {
      return "Invalid Query";
    }
    return "IP Geolocation";
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Query geolocation of IP or domain"}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <IpEmptyView title={emptyViewTitle()} />
      {ipGeolocation.map((value, index) => (
        <List.Item
          key={index}
          icon={ipListIcons[index]}
          title={value[0]}
          subtitle={value[1]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard icon={ipListIcons[index]} title={`Copy ${value[0]}`} content={value[1]} />
              <Action.CopyToClipboard
                title={`Copy All Info`}
                content={JSON.stringify(Object.fromEntries(ipGeolocation), null, 2)}
              />
              <ActionPanel.Section>
                <ActionOpenExtensionPreferences />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
