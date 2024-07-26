import { Action, ActionPanel, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { CloneForm } from "./components/CloneForm";
import { ExtendedRepositoryFieldsFragment } from "./generated/graphql";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyRepositories } from "./hooks/useRepositories";

function CloneRepository() {
  const { push } = useNavigation();

  const { data: allRepositories, isLoading, error } = useMyRepositories();

  if (error) {
    showToast(Toast.Style.Failure, "Failed to load repositories", error.message);
  }

  const accounts = Array.from(new Set(allRepositories?.map((repo) => repo.owner.login) || []));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select an account...">
      {accounts.map((account) => (
        <List.Item
          key={account}
          title={account}
          actions={
            <ActionPanel>
              <Action
                title="Select Account"
                onAction={() => {
                  push(<RepositoryList account={account} repositories={allRepositories || []} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RepositoryList({
  account,
  repositories,
}: {
  account: string;
  repositories: ExtendedRepositoryFieldsFragment[];
}) {
  const [searchText, setSearchText] = useState("");

  const filteredRepositories = repositories.filter(
    (repo) => repo.owner.login === account && repo.nameWithOwner.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search repositories...">
      {filteredRepositories.map((repository) => (
        <RepositoryListItem key={repository.id} repository={repository} />
      ))}
    </List>
  );
}

function RepositoryListItem({ repository }: { repository: ExtendedRepositoryFieldsFragment }) {
  return (
    <List.Item
      title={repository.name}
      subtitle={repository.owner.login}
      accessories={[{ text: repository.stargazerCount?.toString() || "0", icon: "⭐️" }]}
      actions={
        <ActionPanel>
          <Action.Push title="Clone Repository" target={<CloneForm repository={repository} />} />
        </ActionPanel>
      }
    />
  );
}

export default withGitHubClient(CloneRepository);
