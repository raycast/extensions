import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchClusters } from "./actions";
import AWSProfileDropdown from "./components/aws-profile-dropdown";
import { getFilterPlaceholder } from "./util";
import ECSCluster from "./components/ecs/ECSCluster";
import { useState } from "react";

export default function ECS() {
  const [isServicesLoading, setServicesLoading] = useState<boolean>(false);
  const {
    data: clusters,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchClusters, [], { keepPreviousData: true });

  if (error) {
    return <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />;
  }

  return (
    <List
      isLoading={isLoading || isServicesLoading}
      searchBarPlaceholder={getFilterPlaceholder("clusters")}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {clusters ? (
        clusters.map((c) => <ECSCluster key={c.clusterArn} cluster={c} setIsLoading={setServicesLoading} />)
      ) : (
        <List.EmptyView title="No clusters found" />
      )}
    </List>
  );
}
