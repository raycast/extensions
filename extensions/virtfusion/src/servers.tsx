import { useCachedPromise } from "@raycast/utils";
import { Panel } from "./types";
import VirtFusion from "./virtfusion";
import { Icon, List } from "@raycast/api";

export default function Servers({panel}: {panel: Panel}) {
  // const vf = new VirtFusion(panel);
  // const {isLoading, data:servers} = useCachedPromise(vf.listServers, [], {initialData: []})
  const {isLoading, data:servers} = useCachedPromise(async()=>{
    const vf = new VirtFusion(panel);
    const servers = await vf.listServers();
    return servers.data;
  }, [], {initialData: []})
  return <List isLoading={isLoading}>
      {servers.map(server => <List.Item key={server.id} icon={Icon.HardDrive} title={server.name} accessories={[
        {text: server.memory},
        {text: server.cpu},
        {text: server.storage[0].capacity},
        {text: server.network.primary.limit},
        {tag: server.network.primary.ipv4[0].address}
      ]} />)}
    </List>
}
