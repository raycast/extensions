import { List } from "@raycast/api";
import { DomainListItem, DomainListProps } from "../types/nextdns";
import { EmptyView } from "../components/empty-view";
import { ListItem } from "../components/list-item";
import { PREFERENCES } from "./constants";

export const DomainList: React.FC<DomainListProps> = ({ data, isLoading, onRemoveItem }) => (
  <List
    isLoading={isLoading}
    searchBarPlaceholder={`Search allowlist of ${data.profileName} (${PREFERENCES.nextdns_profile_id}`}
  >
    {data.result?.map((element: DomainListItem) => (
      <ListItem key={element.id} siteItem={element} onRemoveItem={onRemoveItem} />
    ))}

    {Object.keys(data).length === 0 && <EmptyView title="No domains in allowlist" icon={{ source: "no_view.png" }} />}
    <EmptyView title="No Results" icon={{ source: "no_view.png" }} />
  </List>
);
