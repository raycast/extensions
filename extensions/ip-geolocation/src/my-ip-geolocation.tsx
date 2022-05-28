import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import React from "react";
import { searchMyIpGeolocation } from "./hooks/hooks";
import { IpEmptyView } from "./components/ip-empty-view";
import { myIpListIcons } from "./utils/constants";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { Preferences } from "./types/preferences";

export default function SearchIpGeolocation() {
  const { language, showIPv6 } = getPreferenceValues<Preferences>();
  const { ipGeolocation, loading } = searchMyIpGeolocation(language, showIPv6);

  return (
    <List isLoading={loading} searchBarPlaceholder={"My IP Geolocation"}>
      <IpEmptyView title={"No Geolocation Info"} />
      {ipGeolocation.map((value, index) => (
        <List.Item
          key={index}
          icon={{ source: { light: myIpListIcons[index].light, dark: myIpListIcons[index].dark } }}
          title={value[0]}
          subtitle={value[1]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                icon={{ source: { light: myIpListIcons[index].light, dark: myIpListIcons[index].dark } }}
                title={`Copy ${value[0]}`}
                content={value[1]}
              />
              <Action.CopyToClipboard
                title={`Copy All Info`}
                content={JSON.stringify(Object.fromEntries(ipGeolocation), null, 2)}
              />
              <ActionOpenExtensionPreferences />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
