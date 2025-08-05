import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getFilterPlaceholder } from "./util";
import { fetchRepositories } from "./actions/ecr";
import ECRRepository from "./components/ecr/ECRRepository";

export default function ECR() {
  const {
    data: repositories,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchRepositories, [], { keepPreviousData: true });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("repositories")}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
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
