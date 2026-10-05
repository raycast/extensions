import { Action, ActionPanel, Color, Icon, List, type LaunchProps } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { getSelectedSite } from "./api/preferences";
import type { ClientType, NetworkClient } from "./api/types";
import { MissingSite, ResourceError } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";
import {
  getFavoriteClients,
  resolveClientPresence,
  setClientFavorite,
  type ClientPresence,
} from "./lib/client-favorites";
import { formatDate } from "./lib/format";

const CLIENT_ICONS: Record<ClientType, string> = {
  TELEPORT: "sparkles.svg",
  VPN: "vpn.svg",
  WIRED: "port.svg",
  WIRELESS: "wifi.svg",
};

function ClientMetadata({ client, connected }: { client: NetworkClient; connected: boolean }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Presence"
        text={connected ? "Connected" : "Not currently connected"}
        icon={{
          source: connected ? Icon.CircleProgress100 : Icon.Circle,
          tintColor: connected ? Color.Green : Color.Red,
        }}
      />
      <List.Item.Detail.Metadata.Label title="Type" text={client.type} icon={CLIENT_ICONS[client.type]} />
      <List.Item.Detail.Metadata.Label title="Name" text={client.name} />
      <List.Item.Detail.Metadata.Label title="IP Address" text={client.ipAddress} />
      <List.Item.Detail.Metadata.Label title="MAC Address" text={client.macAddress} />
      <List.Item.Detail.Metadata.Label title="Connected" text={formatDate(client.connectedAt)} />
      <List.Item.Detail.Metadata.Label title="Access" text={client.access?.type} />
      {client.access?.authorized !== undefined ? (
        <List.Item.Detail.Metadata.Label
          title="Authorized"
          text={client.access.authorized ? "Yes" : "No"}
          icon={client.access.authorized ? Icon.Checkmark : Icon.XMarkCircle}
        />
      ) : null}
      <List.Item.Detail.Metadata.Label title="Client ID" text={client.id} />
      <List.Item.Detail.Metadata.Label title="Uplink Device ID" text={client.uplinkDeviceId} />
    </List.Item.Detail.Metadata>
  );
}

type ViewClientsProps = LaunchProps<{ arguments: { search?: string } }>;

export default function ViewClients(props: ViewClientsProps) {
  const client = useUniFiClient();
  const [searchText, setSearchText] = useState(props.arguments.search ?? "");
  const siteLoad = useCallback(() => getSelectedSite(), []);
  const { data: site, isLoading: siteIsLoading } = useAsyncResource(siteLoad);
  const clientLoad = useCallback(
    (signal: AbortSignal) => (site ? client.listClients(site.id, signal) : Promise.resolve([])),
    [client, site],
  );
  const { data: clients = [], error, isLoading, revalidate } = useAsyncResource(clientLoad);
  const favoritesLoad = useCallback(() => (site ? getFavoriteClients(site.id) : Promise.resolve([])), [site]);
  const {
    data: favoriteClients = [],
    error: favoritesError,
    isLoading: favoritesAreLoading,
    revalidate: revalidateFavorites,
  } = useAsyncResource(favoritesLoad);
  const presence = useMemo(() => resolveClientPresence(clients, favoriteClients), [clients, favoriteClients]);
  const sections = useMemo(() => {
    const grouped = new Map<ClientType, NetworkClient[]>();
    for (const item of presence.others) grouped.set(item.type, [...(grouped.get(item.type) ?? []), item]);
    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [presence.others]);

  const toggleFavorite = useCallback(
    async (item: NetworkClient, favorite: boolean) => {
      if (!site) return;
      await setClientFavorite(site.id, item, favorite);
      await revalidateFavorites();
    },
    [revalidateFavorites, site],
  );

  if (!site && !siteIsLoading) return <MissingSite />;
  if (error) return <ResourceError error={error} onRetry={revalidate} />;
  if (favoritesError) return <ResourceError error={favoritesError} onRetry={revalidateFavorites} />;

  const renderClient = ({ client: item, connected }: ClientPresence, favorite: boolean) => (
    <List.Item
      key={item.id}
      title={item.name}
      subtitle={item.ipAddress}
      icon={{ source: CLIENT_ICONS[item.type], tintColor: connected ? Color.Blue : Color.SecondaryText }}
      keywords={[item.id, item.ipAddress ?? "", item.macAddress ?? "", item.type, item.uplinkDeviceId ?? ""]}
      accessories={[
        ...(favorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Pinned client" }] : []),
        ...(!connected ? [{ tag: { value: "Not connected", color: Color.Red } }] : []),
        ...(item.access?.authorized === false ? [{ tag: { value: "Not authorized", color: Color.Orange } }] : []),
      ]}
      detail={<List.Item.Detail metadata={<ClientMetadata client={item} connected={connected} />} />}
      actions={
        <ActionPanel>
          <Action
            title={favorite ? "Unpin Client" : "Pin Client"}
            icon={favorite ? Icon.StarDisabled : Icon.Star}
            onAction={() => toggleFavorite(item, !favorite)}
          />
          {item.ipAddress ? <Action.CopyToClipboard title="Copy IP Address" content={item.ipAddress} /> : null}
          {item.macAddress ? <Action.CopyToClipboard title="Copy MAC Address" content={item.macAddress} /> : null}
          <Action.CopyToClipboard title="Copy Client ID" content={item.id} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      filtering
      isLoading={isLoading || siteIsLoading || favoritesAreLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, IP, MAC, type, or ID"
      searchText={searchText}
    >
      {presence.favorites.length ? (
        <List.Section title="Pinned" subtitle={`${presence.favorites.length}`}>
          {presence.favorites.map((item) => renderClient(item, true))}
        </List.Section>
      ) : null}
      {sections.map(([type, items]) => (
        <List.Section key={type} title={type} subtitle={`${items.length}`}>
          {items.map((item) => renderClient({ client: item, connected: true }, false))}
        </List.Section>
      ))}
      {!isLoading && clients.length === 0 && favoriteClients.length === 0 ? (
        <List.EmptyView title="No connected or pinned clients found" />
      ) : null}
    </List>
  );
}
