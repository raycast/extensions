import { Action, ActionPanel, List } from "@raycast/api";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { IpEmptyView } from "./components/ip-empty-view";
import { isEmpty } from "./utils/common-utils";
import { myIpListIcons } from "./utils/constants";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { useMyIpGeolocation } from "./hooks/useMyIpGeolocation";
import { useMemo } from "react";

export default function SearchIpGeolocation() {
  const { data: ipGeolocationData, isLoading } = useMyIpGeolocation();

  const ipGeolocation = useMemo(() => {
    return ipGeolocationData || [];
  }, [ipGeolocationData]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={"My IP Geolocation"}>
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
                  <ActionPanel.Section>
                    <ActionOpenCommandPreferences />
                    <ActionOpenExtensionPreferences />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ),
      )}
    </List>
  );
}
