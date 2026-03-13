import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchClusters } from "./actions";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getFilterPlaceholder } from "./util";
import ECSCluster from "./components/ecs/ECSCluster";

export default function ECS() {
  const {
    data: clusters,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchClusters, [], { keepPreviousData: true });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("clusters")}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : clusters && clusters.length > 0 ? (
        clusters.map((c) => <ECSCluster key={c.clusterArn} cluster={c} />)
      ) : (
        <List.EmptyView title="No clusters found" />
      )}
    </List>
  );
}
