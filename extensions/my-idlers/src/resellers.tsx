import { Icon, List } from "@raycast/api";
import useGet from "./hooks";
import { Reseller, ResellerType } from "./types";


export default function Resellers() {
  const { isLoading, data: resellers } = useGet<Reseller>("reseller");

  function getIcon(type: ResellerType) {
    switch (type) {
      case "Direct Admin": return "directadmin-reseller.png";
      default: return Icon.Dot;
    }
  }
  
  return <List isLoading={isLoading}>
    <List.Section title="Resellers" subtitle={resellers.length.toString()}>
    {resellers.map(reseller => <List.Item key={reseller.id} icon={getIcon(reseller.reseller_type)} title={reseller.main_domain} />)}
    </List.Section>
  </List>
}