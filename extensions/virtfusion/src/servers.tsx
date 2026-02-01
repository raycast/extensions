import { useCachedPromise } from "@raycast/utils";
import { Panel } from "./types";
import VirtFusion from "./virtfusion";
import { Icon, List } from "@raycast/api";

export default function Servers({ panel }: { panel: Panel }) {
  const {
    isLoading,
    data: servers,
    pagination,
  } = useCachedPromise(
    () => async (options) => {
      const vf = new VirtFusion(panel);
      const servers = await vf.listServers({ page: options.page + 1 });
      return {
        data: servers.data,
        hasMore: !!servers.next_page_url,
      };
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading} pagination={pagination}>
      {servers.map((server) => (
        <List.Item
          key={server.id}
          icon={Icon.HardDrive}
          title={server.name}
          accessories={[
            { text: server.memory, tooltip: "Memory" },
            { text: server.cpu, tooltip: "CPU" },
            { text: server.storage[0].capacity, tooltip: "Capacity" },
            { text: server.network.primary.limit },
            { tag: server.network.primary.ipv4[0].address },
          ]}
        />
      ))}
    </List>
  );
}
