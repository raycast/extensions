import { Icon, LaunchProps, List } from "@raycast/api";
import useGet from "./hooks";
import { useState } from "react";
import { Domain, Item, Label, Reseller, Server, Shared } from "./types";
import HostingItem from "./components/hosting-item";
import ServerItem from "./components/server-item";
import ItemsSection from "./components/items-section";
import DomainItem from "./components/domain-item";
import { capitalizeFirst } from "./utils";

export default function Items(props: LaunchProps<{ arguments: Arguments.Items }>) {
  const [item, setItem] = useState<string>(props.arguments.item);

  const isItem = !["servers", "shared", "reseller", "domains", "labels"].includes(item);

  const { isLoading: isLoadingItems, data: items } = useGet<Item>(item, {
    execute: isItem,
  });
  const { isLoading: isLoadingDomains, data: domains } = useGet<Domain>(item, {
    execute: item === "domains",
  });
  const { isLoading: isLoadingLabels, data: labels } = useGet<Label>(item, {
    execute: item === "labels",
  });

  const { isLoading: isLoadingServers, data: servers } = useGet<Server>("servers", {
    execute: item === "servers",
  });
  const { isLoading: isLoadingReseller, data: resellers } = useGet<Reseller>("reseller", {
    execute: item === "reseller",
  });
  const { isLoading: isLoadingShared, data: shared } = useGet<Shared>("shared", {
    execute: item === "shared",
  });

  const isLoading =
    isLoadingItems || isLoadingDomains || isLoadingLabels || isLoadingServers || isLoadingReseller || isLoadingShared;

  const icons: { [item: string]: Icon } = {
    servers: Icon.HardDrive,
    reseller: Icon.TwoPeople,
    shared: Icon.Person,
    domains: Icon.Globe,
    labels: Icon.Tag,
    locations: Icon.Pin,
    os: Icon.Cd,
    providers: Icon.AppWindowList,
  };

  const icon = icons[item] ?? Icon.Dot;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isItem && item !== "labels"}
      searchBarAccessory={
        <List.Dropdown tooltip="Item" onChange={setItem} value={item}>
          <List.Dropdown.Item icon={icons.servers} title="Servers" value="servers" />
          <List.Dropdown.Item icon={icons.reseller} title="Reseller" value="reseller" />
          <List.Dropdown.Item icon={icons.shared} title="Shared" value="shared" />
          <List.Dropdown.Item icon={icons.domains} title="Domains" value="domains" />
          <List.Dropdown.Item icon={icons.labels} title="Labels" value="labels" />
          <List.Dropdown.Item icon={icons.locations} title="Locations" value="locations" />
          <List.Dropdown.Item icon={icons.os} title="OS" value="os" />
          <List.Dropdown.Item icon={icons.providers} title="Providers" value="providers" />
        </List.Dropdown>
      }
    >
      {isItem && <ItemsSection title={item === "os" ? "OS" : capitalizeFirst(item)} icon={icon} items={items} />}
      {item === "labels" && (
        <ItemsSection title="Labels" icon={icon} items={labels.map((label) => ({ ...label, name: label.label }))} />
      )}
      {item === "domains" && (
        <List.Section title="Domains" subtitle={domains.length.toString()}>
          {domains.map((domain) => (
            <DomainItem key={domain.id} domain={domain} />
          ))}
        </List.Section>
      )}
      {item === "servers" && (
        <List.Section title="Servers" subtitle={servers.length.toString()}>
          {servers.map((server) => (
            <ServerItem key={server.id} server={server} />
          ))}
        </List.Section>
      )}
      {item === "reseller" && (
        <List.Section title="Resellers" subtitle={resellers.length.toString()}>
          {resellers.map((reseller) => (
            <HostingItem key={reseller.id} host={reseller} />
          ))}
        </List.Section>
      )}
      {item === "shared" && (
        <List.Section title="Shared" subtitle={shared.length.toString()}>
          {shared.map((item) => (
            <HostingItem key={item.id} host={item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
