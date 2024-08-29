import { List } from "@raycast/api";
import { getList, toggleSite } from "./libs/api";
import { PREFERENCES } from "./libs/constants";
import { EmptyView } from "./components/empty-view";
import { ListItem } from "./components/list-item";
import { ErrorView } from "./components/error-view";
import { DomainListItem } from "./types/nextdns";

export default function Command() {
  const { data, isLoading, error, mutate } = getList({ type: "allow" });

  if (error) {
    return <ErrorView />;
  }

  async function removeItem(element: DomainListItem) {
    await mutate(toggleSite({ id: element.id, type: "allow", active: !element.active }), {
      optimisticUpdate(data: { [key: string]: DomainListItem[] } | undefined) {
        if (!data) {
          return {};
        }

        const updatedData = { ...data };
        const list = updatedData.result || [];
        const index = list.findIndex((item) => item.id === element.id);

        if (index !== -1) {
          list[index] = { ...list[index], active: !list[index].active };
        }

        return updatedData;
      },
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search allowlist of ${data?.profileName} (${PREFERENCES.nextdns_profile_id})`}
    >
      {data && (
        <>
          {data.result?.map((element) => (
            <ListItem siteItem={element} onRemoveItem={(item: DomainListItem) => removeItem(item)} type="allow" />
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
