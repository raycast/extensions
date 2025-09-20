import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Client, Site } from "unifi-client";
import { showErrorToast } from "../../utils";
import { isClientConnected } from "../../lib/unifi";
import { RevalidateAction, ToggleDetailsAction } from "../actions";
import { CopyClientIPAction, CopyClientMacAddressAction } from "./actions";
import { useEffect } from "react";

function SingleDetailTag(props: { title: string; text: string; color?: Color.ColorLike | null | undefined }) {
  return (
    <List.Item.Detail.Metadata.TagList title={props.title}>
      <List.Item.Detail.Metadata.TagList.Item text={props.text} color={props.color} />
    </List.Item.Detail.Metadata.TagList>
  );
}

function ClientListItem(props: {
  client: Client;
  showDetails?: boolean;
  setShowDetails?: (newValue: boolean) => void;
  revalidate: () => void;
}) {
  const c = props.client;
  const keywords = [c.ip, c.hostname, c.mac, c.oui].filter((e) => e && e.length > 0) as string[];
  return (
    <List.Item
      title={c.name || "<No Name>"}
      icon={Icon.Monitor}
      keywords={keywords.length > 0 ? keywords : undefined}
      detail={
        props.showDetails === true && (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Hostname" text={c.hostname || "-"} />
                <List.Item.Detail.Metadata.Label title="IP Address" text={c.ip || "-"} />
                <SingleDetailTag title="IP Allocation" text={c.useFixedIp === true ? "Fixed" : "Dynamic"} />
                <List.Item.Detail.Metadata.Label title="MAC Address" text={c.mac ? c.mac : "-"} />
                <List.Item.Detail.Metadata.Label title="Vendor" text={c.oui || "-"} />
                <List.Item.Detail.Metadata.Label
                  title="Last Seen"
                  text={c.lastSeen ? new Date(c.lastSeen).toLocaleString() : "-"}
                />
                <SingleDetailTag title="Guest" text={c.isGuest === true ? "Yes" : "No"} />
                <List.Item.Detail.Metadata.Label
                  title="Channel"
                  text={c.channel === undefined ? "-" : c.channel.toString()}
                />
                <List.Item.Detail.Metadata.Label
                  title="Noise"
                  text={c.noise === undefined ? "?" : c.noise.toString()}
                />

                <SingleDetailTag
                  title="Access"
                  text={c.blocked === true ? "Blocked" : "Granted"}
                  color={c.blocked === true ? Color.Red : Color.Green}
                />
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleDetailsAction showDetails={props.showDetails} setShowDetails={props.setShowDetails} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyClientIPAction client={c} />
            <CopyClientMacAddressAction client={c} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RevalidateAction revalidate={props.revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          tag: props.showDetails === true ? (isClientConnected(c) ? "" : "Offline") : "",
        },
        /*{
          date: c.lastSeen ? new Date(c.lastSeen) : undefined,
          tooltip: c.lastSeen ? `Last Seen: ${new Date(c.lastSeen).toLocaleString()}` : undefined,
        },*/
        {
          tag: props.showDetails === false ? c.ip : "",
        },
      ]}
    />
  );
}

export function SiteClientsList(props: { site: Site }) {
  const [showDetails, setShowDetails] = useCachedState("show-details", true, { cacheNamespace: "clients" });
  const {
    data: clients,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (site: Site) => {
      const clients = await site.clients.list3();
      return clients;
    },
    [props.site],
    { keepPreviousData: true },
  );
  const connected = clients?.filter((c) => isClientConnected(c));
  const disconnected = clients?.filter((c) => !isClientConnected(c));

  useEffect(() => {
    if (error) {
      showErrorToast(error);
    }
  }, [error]);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      <List.Section title="Connected" subtitle={`${connected?.length}`}>
        {connected?.map((c) => (
          <ClientListItem
            key={c._id}
            client={c}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
            revalidate={revalidate}
          />
        ))}
      </List.Section>
      <List.Section title="Disconnected" subtitle={`${disconnected?.length}`}>
        {disconnected?.map((c) => (
          <ClientListItem
            key={c._id}
            client={c}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
            revalidate={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}
