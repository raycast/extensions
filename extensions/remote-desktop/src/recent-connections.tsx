import { List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getRecentRdpConnections } from "./lib/rdp";
import { RDPConnectionListItem } from "./components/connections";

export default function RecentConnections() {
  const { data, isLoading, error } = useCachedPromise(async () => {
    const connections = await getRecentRdpConnections();
    return connections;
  }, []);
  if (error) {
    showFailureToast({ title: "Failed to load recent connections", error });
  }
  return (
    <List isLoading={isLoading}>
      <List.Section title="Recent RDP Connections">
        {data?.map((c, index) => (
          <RDPConnectionListItem key={index} connection={c} />
        ))}
      </List.Section>
    </List>
  );
}
