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

  const {
    isLoading: isLoadingServers,
    data: servers,
    mutate,
  } = useGet<Server>("servers", {
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
        <>
          <List.Section title="Active Domains" subtitle={domains.filter((domain) => domain.active).length.toString()}>
            {domains
              .filter((domain) => domain.active)
              .map((domain) => (
                <DomainItem key={domain.id} domain={domain} />
              ))}
          </List.Section>
          <List.Section
            title="Inactive Domains"
            subtitle={domains.filter((domain) => !domain.active).length.toString()}
          >
            {domains
              .filter((domain) => !domain.active)
              .map((domain) => (
                <DomainItem key={domain.id} domain={domain} />
              ))}
          </List.Section>
        </>
      )}
      {item === "servers" && (
        <>
          <List.Section title="Active Servers" subtitle={servers.filter((server) => server.active).length.toString()}>
            {servers
              .filter((server) => server.active)
              .map((server) => (
                <ServerItem key={server.id} server={server} mutate={mutate} />
              ))}
          </List.Section>
          <List.Section
            title="Inactive Servers"
            subtitle={servers.filter((server) => !server.active).length.toString()}
          >
            {servers
              .filter((server) => !server.active)
              .map((server) => (
                <ServerItem key={server.id} server={server} mutate={mutate} />
              ))}
          </List.Section>
        </>
      )}
      {item === "reseller" && (
        <>
          <List.Section
            title="Active Resellers"
            subtitle={resellers.filter((reseller) => reseller.active).length.toString()}
          >
            {resellers
              .filter((reseller) => reseller.active)
              .map((reseller) => (
                <HostingItem key={reseller.id} host={reseller} />
              ))}
          </List.Section>
          <List.Section
            title="Inactive Resellers"
            subtitle={resellers.filter((reseller) => !reseller.active).length.toString()}
          >
            {resellers
              .filter((reseller) => !reseller.active)
              .map((reseller) => (
                <HostingItem key={reseller.id} host={reseller} />
              ))}
          </List.Section>
        </>
      )}
      {item === "shared" && (
        <>
          <List.Section title="Active Shared" subtitle={shared.filter((item) => item.active).length.toString()}>
            {shared
              .filter((sharedItem) => sharedItem.active)
              .map((sharedItem) => (
                <HostingItem key={sharedItem.id} host={sharedItem} />
              ))}
          </List.Section>
          <List.Section
            title="Inactive Shared"
            subtitle={shared.filter((sharedItem) => !sharedItem.active).length.toString()}
          >
            {shared
              .filter((sharedItem) => !sharedItem.active)
              .map((sharedItem) => (
                <HostingItem key={sharedItem.id} host={sharedItem} />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
