import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type MullvadResponse = {
  ip: string;
  country: string;
  city: string;
  longitude: number;
  latitude: number;
  mullvad_exit_ip: boolean;
  mullvad_exit_ip_hostname: string;
  mullvad_server_type: string;
  blacklisted: {
    blacklisted: boolean;
    results: {
      name: string;
      link: string;
      blacklisted: boolean;
    }[];
  };
  organization: string;
};

export default function Command() {
  const { isLoading, data } = useFetch<MullvadResponse>("https://am.i.mullvad.net/json");

  return (
    <List isLoading={isLoading}>
      <List.Section title="Am I using Mullvad VPN?">
        <List.Item
          icon={data?.mullvad_exit_ip ? Icon.Lock : Icon.LockDisabled}
          title="Status"
          subtitle={data?.mullvad_exit_ip ? "Connected" : "Not connected"}
          accessories={[data?.mullvad_exit_ip ? { text: data.mullvad_server_type, icon: Icon.Cloud } : {}]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Check Online" icon={Icon.Globe} url="https://mullvad.net/check" />
              <Action.CopyToClipboard content={JSON.stringify(data)} title="Copy JSON" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Network}
          title="IP Address"
          subtitle={data?.ip}
          accessories={[{ text: data?.mullvad_exit_ip_hostname, icon: Icon.Network }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={data?.ip || ""} title="Copy IP Address" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title="Location"
          subtitle={`${data?.city} / ${data?.country}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Openstreetmap"
                icon={Icon.Globe}
                url={`https://www.openstreetmap.org/?mlat=${data?.latitude}&mlon=${data?.longitude}&zoom=18`}
              />
              <Action.OpenInBrowser
                title="Open in Google Maps"
                icon={Icon.Globe}
                url={`https://www.google.com/maps/search/?api=1&query=${data?.latitude},${data?.longitude}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={data?.blacklisted.blacklisted ? Icon.EyeDisabled : Icon.Eye}
          title="Blacklisted"
          subtitle={data?.blacklisted.blacklisted ? "Yes" : "No"}
        />
      </List.Section>
    </List>
  );
}
