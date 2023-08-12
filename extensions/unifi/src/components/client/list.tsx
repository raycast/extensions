import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Client, Site } from "unifi-client";
import { showErrorToast } from "../../utils";
import { isClientConnected } from "../../lib/unifi";

function ToggleDetailsAction(props: { showDetails?: boolean; setShowDetails?: (newValue: boolean) => void }) {
  if (props.showDetails === undefined || props.setShowDetails === undefined) {
    return null;
  }
  const handle = () => {
    if (props.setShowDetails) {
      props.setShowDetails(!props.showDetails);
    }
  };
  return (
    <Action
      title={props.showDetails ? "Hide Details" : "Show Details"}
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={handle}
    />
  );
}

function ClientListItem(props: {
  client: Client;
  showDetails?: boolean;
  setShowDetails?: (newValue: boolean) => void;
}) {
  const c = props.client;
  console.log(c);
  return (
    <List.Item
      title={c.name || "<No Name>"}
      detail={
        props.showDetails === true && (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="IP Address" text={c.ip || "-"} />
                <List.Item.Detail.Metadata.Label title="Hostname" text={c.hostname || "-"} />
                <List.Item.Detail.Metadata.Label title="Vendor" text={c.oui || "-"} />
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
      actions={
        <ActionPanel>
          <ToggleDetailsAction showDetails={props.showDetails} setShowDetails={props.setShowDetails} />
        </ActionPanel>
      }
      accessories={[
        {
          tag: props.showDetails === true ? (isClientConnected(c) ? undefined : "Offline") : undefined,
        },
        /*{
          date: c.lastSeen ? new Date(c.lastSeen) : undefined,
          tooltip: c.lastSeen ? `Last Seen: ${new Date(c.lastSeen).toLocaleString()}` : undefined,
        },*/
        {
          tag: props.showDetails === false ? c.ip : undefined,
        },
      ]}
    />
  );
}

export function SiteClientsList(props: { site: Site }) {
  const [showDetails, setShowDetails] = useCachedState("show-details", false, { cacheNamespace: "clients" });
  const {
    data: clients,
    error,
    isLoading,
  } = useCachedPromise(
    async (site: Site) => {
      const clients = await site.clients.list3();
      return clients;
    },
    [props.site],
    { keepPreviousData: true }
  );
  showErrorToast(error);
  const connected = clients?.filter((c) => isClientConnected(c));
  const disconnected = clients?.filter((c) => !isClientConnected(c));
  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      <List.Section title="Connected" subtitle={`${connected?.length}`}>
        {connected?.map((c) => (
          <ClientListItem key={c._id} client={c} showDetails={showDetails} setShowDetails={setShowDetails} />
        ))}
      </List.Section>
      <List.Section title="Disconnected" subtitle={`${disconnected?.length}`}>
        {disconnected?.map((c) => (
          <ClientListItem key={c._id} client={c} showDetails={showDetails} setShowDetails={setShowDetails} />
        ))}
      </List.Section>
    </List>
  );
}
