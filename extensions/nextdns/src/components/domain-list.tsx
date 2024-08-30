import { List } from "@raycast/api";
import { DomainListItem, DomainListProps } from "../types";
import { EmptyView } from "./empty-view";
import { ListItem } from "./list-item";
import { PREFERENCES } from "../libs/constants";
import { getDomains } from "../libs/api";
import { ErrorView } from "./error-view";

export const DomainList: React.FC<DomainListProps> = ({ type }) => {
  const { data, isLoading, error, mutate } = getDomains({ type });

  if (error) {
    return <ErrorView />;
  }
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${type}list of ${data.profileName} (${PREFERENCES.nextdns_profile_id}`}
    >
      {data.result?.map((element: DomainListItem) => (
        <ListItem key={element.id} domainItem={element} mutate={mutate} />
      ))}

      {Object.keys(data).length === 0 && (
        <EmptyView title={`No domains in ${type}list`} icon={{ source: "no_view.png" }} mutate={mutate} type={type} />
      )}
      <EmptyView title="No Results" icon={{ source: "no_view.png" }} mutate={mutate} type={type} />
    </List>
  );
};
