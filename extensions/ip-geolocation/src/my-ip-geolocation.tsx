import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { IpEmptyView } from "./components/ip-empty-view";
import { useMyIpGeolocation } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { isEmpty } from "./utils/common-utils";
import { myIpListIcons } from "./utils/constants";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";

export default function SearchIpGeolocation() {
  const { language, showIPv6, coordinatesFormat } = getPreferenceValues<Preferences>();
  const { ipGeolocation, loading } = useMyIpGeolocation(language, showIPv6, coordinatesFormat);

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
