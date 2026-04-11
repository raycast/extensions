import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchClusters } from "./actions";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { getFilterPlaceholder } from "./util";
import ECSCluster from "./components/ecs/ECSCluster";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";

export default function ECS() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa } = useMfaGuard();
  const {
    data: clusters,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchClusters, [], { keepPreviousData: true });

  if (mfaLoading) {
    return <List isLoading={true} />;
  }

  if (needsMfa) {
    return (
      <MfaPrompt
        roleId={activeRole}
        onSuccess={() => {
          revalidateMfa();
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("clusters")}
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
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
