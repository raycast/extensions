import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { getFilterPlaceholder } from "./util";
import { fetchRepositories } from "./actions/ecr";
import ECRRepository from "./components/ecr/ECRRepository";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";

export default function ECR() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa } = useMfaGuard();
  const {
    data: repositories,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchRepositories, [], { keepPreviousData: true });

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
      searchBarPlaceholder={getFilterPlaceholder("repositories")}
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : repositories && repositories.length > 0 ? (
        repositories.map((r) => <ECRRepository key={r.repositoryArn} repository={r} />)
      ) : (
        <List.EmptyView title="No repositories found" />
      )}
    </List>
  );
}
