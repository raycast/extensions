import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import React from "react";
import { searchMyIpGeolocation } from "./hooks/hooks";
import { IpEmptyView } from "./components/ip-empty-view";
import { myIpListIcons } from "./utils/constants";
import { Preferences } from "./types/preferences";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";

export default function SearchIpGeolocation() {
  const { language, showIPv6 } = getPreferenceValues<Preferences>();
  const { ipGeolocation, loading } = searchMyIpGeolocation(language, showIPv6);

  return (
    <List isLoading={loading} searchBarPlaceholder={"My IP Geolocation"}>
      <IpEmptyView title={"No Geolocation Info"} />
      {ipGeolocation.map(
        (value, index) =>
          !isEmpty(value[1]) && (
            <List.Item
              key={index}
              icon={myIpListIcons[index]}
              title={value[0]}
              subtitle={value[1]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard icon={myIpListIcons[index]} title={`Copy ${value[0]}`} content={value[1]} />
                  <Action.CopyToClipboard
                    title={`Copy All Info`}
                    content={JSON.stringify(Object.fromEntries(ipGeolocation), null, 2)}
                  />
                  <ActionOpenCommandPreferences />
                </ActionPanel>
              }
            />
          )
      )}
    </List>
  );
}
