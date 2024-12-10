import { List } from "@raycast/api";
import useGet, { useGetPricing } from "./hooks";
import { Domain, Misc, Reseller, Server, Shared } from "./types";

export default function Dashboard() {
  const { isLoading: isLoadingServers, data: servers } = useGet<Server>("servers", { execute: false });
  const { isLoading: isLoadingShared, data: shared } = useGet<Shared>("shared", { execute: false });
  const { isLoading: isLoadingReseller, data: reseller } = useGet<Reseller>("reseller", { execute: false });
  const { isLoading: isLoadingDomains, data: domains } = useGet<Domain>("domains", { execute: false });
  const { isLoading: isLoadingMisc, data: misc } = useGet<Misc>("misc", { execute: false });
  
  const { isLoading: isLoadingPricing, data: pricing } = useGetPricing();
  
  const sum = servers.filter(server => server.active).reduce(
    (acc, server) => {
      acc.cpu += server.cpu;
      acc.ram += server.ram_as_mb;
      acc.disk += server.disk_as_gb;
      acc.bandwidth += server.bandwidth;
      acc.locations.add(server.location_id);
      acc.providers.add(server.provider_id);
      return acc;
    },
    { cpu: 0, ram: 0, disk: 0, bandwidth: 0, locations: new Set(), providers: new Set() }
  );
  const averages = { ...sum, ram: (sum.ram/1024).toFixed(2), bandwidth: (sum.bandwidth/1024).toFixed(2), locations: sum.locations.size, providers: sum.providers.size };
  
  const isLoading = isLoadingServers || isLoadingShared || isLoadingReseller || isLoadingDomains || isLoadingMisc || isLoadingPricing;

  return <List isLoading={isLoading} isShowingDetail>
    <List.Item title="Tally" detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Servers" text={servers.length.toString()} />
      <List.Item.Detail.Metadata.Label title="Shared" text={shared.length.toString()} />
      <List.Item.Detail.Metadata.Label title="Reseller" text={reseller.length.toString()} />
      <List.Item.Detail.Metadata.Label title="Domains" text={domains.length.toString()} />
      <List.Item.Detail.Metadata.Label title="Misc" text={misc.length.toString()} />
    </List.Item.Detail.Metadata>} />} />
    <List.Item title="Costings" detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Weekly Cost" text={pricing.weekly} />
      <List.Item.Detail.Metadata.Label title="Monthly Cost" text={pricing.monthly} />
      <List.Item.Detail.Metadata.Label title="Yearly Cost" text={pricing.yearly} />
    </List.Item.Detail.Metadata>} />} />
    <List.Item title="Averages" detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="CPU" text={averages.cpu.toString()} />
      <List.Item.Detail.Metadata.Label title="RAM" text={`${averages.ram} GB`} />
      <List.Item.Detail.Metadata.Label title="DISK" text={`${averages.disk} GB`} />
      <List.Item.Detail.Metadata.Label title="Bandwidth" text={`${averages.bandwidth} TB`} />
      <List.Item.Detail.Metadata.Label title="Locations" text={averages.locations.toString()} />
      <List.Item.Detail.Metadata.Label title="Providers" text={averages.providers.toString()} />
    </List.Item.Detail.Metadata>} />} />
  </List>
}