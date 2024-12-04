import { Icon, List } from "@raycast/api";
import { Reseller, Term } from "../types";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';
import { numOrUnmetered } from "../utils";
import { HostingType, Shared } from "../types";
dayjs.extend(relativeTime);

export default function HostingItem({ host }: { host: Reseller | Shared }) {
  function getIcon(type: HostingType) {
    switch (type) {
      case "Direct Admin": return "directadmin-reseller.png";
      default: return Icon.Dot;
    }
  }

  function getTermChar(term: Term) {
    switch (term) {
      case 1: return "m";
      case 2: return "?";
      case 3: return "?";
      case 4: return "y";
      case 5: return "?";
      case 6: return "?";
    }
  }

  const icon = getIcon(("reseller_type" in host) ? host.reseller_type : host.shared_type);

  return <List.Item icon={icon} title={host.main_domain} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
    <List.Item.Detail.Metadata.Label title="Name" text={host.main_domain} />
    <List.Item.Detail.Metadata.Label title="Type" icon={icon} text={("reseller_type" in host) ? host.reseller_type : host.shared_type} />
    {("accounts" in host) && <List.Item.Detail.Metadata.Label title="Accounts" text={host.accounts.toString()} />}
    <List.Item.Detail.Metadata.Label title="Location" text={host.location.name} />
    <List.Item.Detail.Metadata.Label title="Provider" text={host.provider.name} />
    <List.Item.Detail.Metadata.Label title="Disk" text={`${host.disk} ${host.disk_type}`} />
    <List.Item.Detail.Metadata.Label title="Domains" text={host.domains_limit.toString()} />
    <List.Item.Detail.Metadata.Label title="Price" text={`${host.price.price} ${host.price.currency} p/${getTermChar(host.price.term)}`} />
    <List.Item.Detail.Metadata.Label title="Due" text={`${dayjs(host.price.next_due_date).fromNow(true)} from now`} />
    <List.Item.Detail.Metadata.Label title="Had Since" text={host.owned_since} />
    <List.Item.Detail.Metadata.Separator />
    <List.Item.Detail.Metadata.Label title="Has dedicated IP?" text={host.ips.length ? "Yes" : "No"} />
    <List.Item.Detail.Metadata.Label title="Subdomains Limit" text={numOrUnmetered(host.subdomains_limit)} />
    <List.Item.Detail.Metadata.Label title="DB Limit" text={numOrUnmetered(host.db_limit)} />
    <List.Item.Detail.Metadata.Label title="FTP Limit" text={numOrUnmetered(host.ftp_limit)} />
  </List.Item.Detail.Metadata>} />} />
}