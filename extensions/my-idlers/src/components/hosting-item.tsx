import { Icon, List } from "@raycast/api";
import { Reseller } from "../types";
import { numOrUnlimited } from "../utils";
import { HostingType, Shared } from "../types";
import { getFavicon } from "@raycast/utils";
import PriceListItem from "./price-list-item";
import NextDueDate from "./next-due-date";

export default function HostingItem({ host }: { host: Reseller | Shared }) {
  function getIconByType(type: HostingType) {
    switch (type) {
      case "Direct Admin":
        return "directadmin-reseller.png";
      case "cPanel":
        return "cpanel@dark.png";
      default:
        return Icon.Dot;
    }
  }

  const icon = getIconByType("reseller_type" in host ? host.reseller_type : host.shared_type);

  return (
    <List.Item
      icon={getFavicon(`https://${host.main_domain}`, { fallback: icon })}
      title={host.main_domain}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={host.main_domain} />
              <List.Item.Detail.Metadata.Label
                title="Type"
                icon={icon}
                text={"reseller_type" in host ? host.reseller_type : host.shared_type}
              />
              {"accounts" in host && (
                <List.Item.Detail.Metadata.Label title="Accounts" text={host.accounts.toString()} />
              )}
              <List.Item.Detail.Metadata.Label title="Location" text={host.location.name} />
              <List.Item.Detail.Metadata.Label title="Provider" text={host.provider.name} />
              <List.Item.Detail.Metadata.Label title="Disk" text={`${host.disk} ${host.disk_type}`} />
              <List.Item.Detail.Metadata.Label title="Domains" text={numOrUnlimited(host.domains_limit)} />
              <PriceListItem price={host.price} />
              <NextDueDate date={host.price.next_due_date} />
              <List.Item.Detail.Metadata.Label title="Had Since" text={host.owned_since} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Has dedicated IP?" text={host.ips.length ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="Subdomains Limit" text={numOrUnlimited(host.subdomains_limit)} />
              <List.Item.Detail.Metadata.Label title="DB Limit" text={numOrUnlimited(host.db_limit)} />
              <List.Item.Detail.Metadata.Label title="FTP Limit" text={numOrUnlimited(host.ftp_limit)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
