import { List } from "@raycast/api";
import { getList, toggleSite } from "./libs/api";
import { PREFERENCES } from "./libs/constants";
import { EmptyView } from "./components/empty-view";
import { ListItem } from "./components/list-item";
import { ErrorView } from "./components/error-view";
import { DomainListItem } from "./types/nextdns";
import { removeItem } from "./libs/utils";

export default function Command() {
  const type = "allow";
  const { data, isLoading, error, mutate } = getList({ type });

  if (error) {
    return <ErrorView />;
  }

  async function handleRemoveItem(element: DomainListItem) {
    await removeItem(element, mutate);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${type}list of ${data?.profileName} (${PREFERENCES.nextdns_profile_id})`}
    >
      {data && (
        <>
          {data.result?.map((element: DomainListItem) => (
            <ListItem siteItem={element} onRemoveItem={(item: DomainListItem) => handleRemoveItem(item)} />
          ))}

          {Object.keys(data).length === 0 && (
            <EmptyView title="No domains in allowlist" icon={{ source: "no_view.png" }} />
          )}
        </>
      )}
      <EmptyView title="No Results" icon={{ source: "no_view.png" }} />
    </List>
  );
}
