import { useCachedPromise } from "@raycast/utils";
import { Panel, Server } from "./types";
import VirtFusion from "./virtfusion";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

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
            { text: server.network.primary.limit, tooltip: "Traffic" },
            { tag: server.network.primary.ipv4[0].address },
          ]}
          actions={<ActionPanel>
            <Action.Push icon={Icon.List} title="Server Details" target={<ServerDetails panel={panel} server={server} />} />
          </ActionPanel>}
        />
      ))}
    </List>
  );
}

const getDriveLetter = (index: number) => String.fromCharCode(64+index);
function ServerDetails({panel,server}:{panel: Panel,server: Server}) {
  const {
    isLoading,
    data: tasks,
    pagination,
  } = useCachedPromise(
    () => async (options) => {
      const vf = new VirtFusion(panel);
      const tasks = await vf.listServerTasks({ serverId: server.id, page: options.page + 1 });
      return {
        data: tasks.data,
        hasMore: !!tasks.next_page_url,
      };
    },
    [],
    { initialData: [] },
  );

  return <List isLoading={isLoading} pagination={pagination}>
    <List.Section title="Media">
      <List.Item title="Boot Order" accessories={server.bootOrder.map(item => ({icon: item==="hd" ? Icon.HardDrive : item==="cdrom" ? Icon.Cd : undefined, text: item}))} />
    </List.Section>
    <List.Section title="Storage">
      {server.storage.map((drive, index) => <List.Item key={getDriveLetter(index+1)} icon={Icon.HardDrive} title={`Drive: ${getDriveLetter(index+1)}`} subtitle={drive.capacity} accessories={[
        drive.primary ? {tag: {value:"PRIMARY", color: Color.Yellow}} : drive.enabled ? {tag: {value: "READY", color: Color.Blue}} : {}
      ]} />)}
    </List.Section>
    <List.Section title="Network > IPv4 Addresses">
      {server.network.primary.ipv4.map(ip => <List.Item key={ip.address} icon={Icon.Network} title={ip.address} accessories={[
        {text: `GATEWAY: ${ip.gateway}`},
        {text: `NETMASK: ${ip.netmask}`},
      ]} />)}
    </List.Section>
    <List.Section title="Tasks">
      {tasks.map(task => <List.Item key={Icon.Document} title={task.action} subtitle={task.started} accessories={[{tag: {value:task.status, color: task.status==="complete" ? Color.Blue : undefined}}]} />)}
    </List.Section>
  </List>
}