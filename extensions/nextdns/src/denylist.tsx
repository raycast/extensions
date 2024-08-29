import { Icon, List } from "@raycast/api";
import { getList } from "./libs/api";
import { PREFERENCES } from "./libs/constants";
import { EmptyView } from "./components/empty-view";
import { ListItem } from "./components/list-item";

export default function Command() {
  const { data, isLoading, error } = getList({ type: "deny" });

  if (error) {
    return (
      <List>
        <EmptyView title="Failed to load data" icon={Icon.Warning}></EmptyView>
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search denylist of ${data?.profileName} (${PREFERENCES.nextdns_profile_id})`}
    >
      {data && (
        <>
          {data.result?.map((element) => <ListItem id={element.id} active={element.active} />)}

          {Object.keys(data).length === 0 && (
            <EmptyView title="No domains in denylist" icon={{ source: "no_view.png" }} />
          )}
        </>
      )}
      <EmptyView title="No Results" icon={{ source: "no_view.png" }} />
    </List>
  );
}
