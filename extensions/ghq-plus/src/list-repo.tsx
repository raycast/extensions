import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EmptyState, GhqPathNotConfigured } from "./components/EmptyState";
import { GetRepositoryForm } from "./components/GetRepositoryForm";
import { RepositoryItem } from "./components/RepositoryItem";
import { useGhqPreferences } from "./components/useGhqPreferences";
import { createGhqExecutor, listRepositories, type Repository } from "./lib/ghq";

export default function Command() {
  const { openers, ghqBinary } = useGhqPreferences();

  const {
    data: repositories,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise((binary: string) => listRepositories(createGhqExecutor(binary)), [ghqBinary ?? ""], {
    execute: ghqBinary !== undefined,
    initialData: [] as Repository[],
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to run ghq" },
  });

  if (!ghqBinary) {
    return <GhqPathNotConfigured />;
  }

  if (openers.length === 0) {
    return (
      <EmptyState
        title="Editor or Terminal Not Configured"
        description="Choose at least one application to open repositories with in the extension preferences."
      />
    );
  }

  if (error) {
    return <EmptyState title="Failed to Run ghq" description={error.message} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search repositories…">
      {/* Raycast also shows the empty view when the search matches nothing, i.e. when a repository is missing. */}
      <List.EmptyView
        icon={Icon.Folder}
        title="No Repositories"
        description="Press Enter to get a repository with ghq."
        actions={
          <ActionPanel>
            {/* Refreshed when the clone succeeds, because leaving the form can come first, and when the form is left,
                because a failed or cancelled clone can leave a repository behind as well. */}
            <Action.Push
              title="Get Repository"
              icon={Icon.Download}
              target={<GetRepositoryForm onGet={revalidate} />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {repositories.map((repository) => (
        <RepositoryItem key={repository.path} repository={repository} openers={openers} />
      ))}
    </List>
  );
}
