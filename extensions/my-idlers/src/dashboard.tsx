import { Icon, List } from "@raycast/api";
import useGet from "./hooks";
import Servers from "./components/servers";

type Provider = {
  id: number
  name: string
}
export default function Dashboard() {
  return <Servers />
  // const { isLoading, data: providers } =useGet<Provider>("providers");
  
  // return <List isLoading={isLoading}>
  //   <List.Section title="Providers" subtitle={providers.length.toString()}>
  //   {providers.map(provider => <List.Item key={provider.id} icon={Icon.Dot} title={provider.name} />)}
  //   </List.Section>
  // </List>
}