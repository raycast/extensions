import { Icon, List } from "@raycast/api";
import { Domain } from "../types";
import { getFavicon } from "@raycast/utils";
import PriceListItem from "./price-list-item";
import NextDueDate from "./next-due-date";

export default function DomainItem({ domain }: { domain: Domain }) {
  const title = domain.domain + "." + domain.extension;
  const url = title.includes("http") ? title : `https://${title}`;
  return (
    <List.Item
      icon={getFavicon(url, { fallback: Icon.Globe })}
      title={title}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Domain" text={title} />
              <PriceListItem price={domain.price} />
              <List.Item.Detail.Metadata.Label title="Owned since" text={domain.owned_since} />
              <NextDueDate date={domain.price.next_due_date} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
