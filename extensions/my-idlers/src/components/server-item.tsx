import { Icon, List } from "@raycast/api";
import { Server, ServerType } from "../types";
import PriceListItem from "./price-list-item";
import NextDueDate from "./next-due-date";
import { numOrUnlimited } from "../utils";

export default function ServerItem({ server }: { server: Server }) {
  return (
    <List.Item
      icon={Icon.HardDrive}
      title={server.hostname}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Hostname" text={server.hostname} />
              <List.Item.Detail.Metadata.Label title="Type" text={ServerType[server.server_type]} />
              <List.Item.Detail.Metadata.Label title="OS" text={server.os.name} />
              <List.Item.Detail.Metadata.Label title="Location" text={server.location.name} />
              <List.Item.Detail.Metadata.Label title="Provider" text={server.provider.name} />
              <PriceListItem price={server.price} />
              <NextDueDate date={server.price.next_due_date} />
              <List.Item.Detail.Metadata.Label title="CPU" text={server.cpu.toString()} />
              <List.Item.Detail.Metadata.Label title="RAM" text={`${server.ram} ${server.ram_type}`} />
              <List.Item.Detail.Metadata.Label title="Disk" text={`${server.disk} ${server.disk_type}`} />
              <List.Item.Detail.Metadata.Label
                title="Bandwidth"
                text={`${numOrUnlimited(server.bandwidth, "Unmetered")} GB`}
              />
              <List.Item.Detail.Metadata.TagList title="IPv4">
                {server.ips
                  .filter((ip) => ip.is_ipv4)
                  .map((ip) => (
                    <List.Item.Detail.Metadata.TagList.Item key={ip.address} text={ip.address} />
                  ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="IPv6">
                {server.ips
                  .filter((ip) => !ip.is_ipv4)
                  .map((ip) => (
                    <List.Item.Detail.Metadata.TagList.Item key={ip.address} text={ip.address} />
                  ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Was promo" text={server.was_promo === 0 ? "No" : "Yes"} />
              <List.Item.Detail.Metadata.Label title="Owned since" text={server.owned_since} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
