import {
  ActionPanel,
  Color,
  Detail,
  environment,
  Icon,
  List,
  showToast,
  useNavigation,
  Action,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { Repository, UserDataResponse } from "./types";
import { useDebounce } from "use-debounce";
import { useRepositories } from "./useRepositories";
import { clearVisitedRepositories, useVisitedRepositories } from "./useVisitedRepositories";
import { getAccessoryTitle, getIcon, getSubtitle } from "./utils";
import { useRepositoryReleases } from "./useRepositoryReleases";
import { OpenInWebIDEAction } from "./website";
import { useUserData } from "./useGithubUser";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [debouncedSearchText] = useDebounce(searchText, 200);
  const {
    data: repositories,
    error: searchRepositoriesError,
    isLoading: isLoadingRepositories,
  } = useRepositories(debouncedSearchText, searchFilter);
  const { data: userData, error: fetchUserDataError } = useUserData();

  const {
    repositories: visitedRepositories,
    visitRepository,
    isLoading: isLoadingVisitedRepositories,
  } = useVisitedRepositories();

  if (searchRepositoriesError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed searching repositories",
      message:
        searchRepositoriesError instanceof Error ? searchRepositoriesError.message : String(searchRepositoriesError),
    });
  }
  if (fetchUserDataError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed fetching user and organizations",
      message: fetchUserDataError instanceof Error ? fetchUserDataError.message : String(fetchUserDataError),
    });
  }

  const isLoading = searchText !== debouncedSearchText || isLoadingVisitedRepositories || isLoadingRepositories;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<FilterDropdown userData={userData} onFilterChange={setSearchFilter} />}
    >
      <List.Section
        title="Visited Repositories"
        subtitle={visitedRepositories ? String(visitedRepositories.length) : undefined}
      >
        {visitedRepositories
          ?.filter(
            (r) =>
              r.nameWithOwner.includes(searchText ?? "") &&
              r.nameWithOwner.match(
                // Converting query filter string to regexp:
                `${searchFilter?.replaceAll(/org:|user:/g, "").replaceAll(" ", "|")}/.*`
              )
          )
          .map((repository) => (
            <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
          ))}
      </List.Section>
      <List.Section
        title="Found Repositories"
        subtitle={repositories ? String(repositories.repositoryCount) : undefined}
      >
        {repositories?.nodes?.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
    </List>
  );
}

function FilterDropdown({
  userData,
  onFilterChange,
}: {
  userData: UserDataResponse["viewer"] | undefined;
  onFilterChange: (filter: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter Repositories" storeValue={true} onChange={onFilterChange}>
      <List.Dropdown.Item title={"All Repositories"} value={""} />
      {userData && (
        <List.Dropdown.Item
          title={"My Repositories"}
          value={`user:${userData.login} ${userData.organizations.nodes.map((org) => `org:${org.login}`).join(" ")}`}
        />
      )}
      {userData && (
        <List.Dropdown.Section>
          <List.Dropdown.Item title={userData.login} value={`user:${userData.login}`} />
          {userData.organizations.nodes.map((org) => (
            <List.Dropdown.Item key={org.login} title={org.login} value={`org:${org.login}`} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}

function RepositoryListItem(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  return (
    <List.Item
      icon={getIcon(props.repository)}
      title={props.repository.nameWithOwner}
      subtitle={getSubtitle(props.repository)}
      actions={<Actions repository={props.repository} onVisit={props.onVisit} />}
      accessories={[
        {
          text: getAccessoryTitle(props.repository),
        },
      ]}
    />
  );
}

function Actions(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  const { push } = useNavigation();

  return (
    <ActionPanel title={props.repository.nameWithOwner}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.repository.url} onOpen={() => props.onVisit(props.repository)} />
        <OpenInWebIDEAction repository={props.repository} onOpen={() => props.onVisit(props.repository)} />
        <Action.OpenInBrowser
          icon="vscode-action-icon.png"
          title="Clone in VSCode"
          url={`vscode://vscode.git/clone?url=${props.repository.url}`}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          icon={{ source: "pull-request.png", tintColor: Color.PrimaryText }}
          title="Open Pull Requests"
          url={`${props.repository.url}/pulls`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onOpen={() => props.onVisit(props.repository)}
        />
        {props.repository.hasIssuesEnabled && (
          <Action.OpenInBrowser
            icon={{ source: "issue.png", tintColor: Color.PrimaryText }}
            title="Open Issues"
            url={`${props.repository.url}/issues`}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.hasWikiEnabled && (
          <Action.OpenInBrowser
            icon={{ source: "wiki.png", tintColor: Color.PrimaryText }}
            title="Open Wiki"
            url={`${props.repository.url}/wiki`}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.hasProjectsEnabled && (
          <Action.OpenInBrowser
            icon={{ source: "project.png", tintColor: Color.PrimaryText }}
            title="Open Projects"
            url={`${props.repository.url}/projects`}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.releases?.totalCount > 0 && (
          <Action
            icon={Icon.List}
            title="Browse Releases"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => push(<ReleaseView repository={props.repository} />)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Repository URL"
          content={props.repository.url}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Name with Owner"
          content={props.repository.nameWithOwner}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Clone Command"
          content={`git clone ${props.repository.url}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
      </ActionPanel.Section>
      <DevelopmentActionSection />
    </ActionPanel>
  );
}

function DevelopmentActionSection() {
  async function handleClearVisitedRepositories() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing visted repositories",
    });

    try {
      await clearVisitedRepositories();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared visited repositories";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing visited repositories";
      toast.message = error instanceof Error ? error.message : undefined;
      console.error("Failed clearing visited repositories", error);
    }
  }

  return environment.isDevelopment ? (
    <ActionPanel.Section title="Development">
      <Action icon={Icon.Trash} title="Clear Visited Repositories" onAction={handleClearVisitedRepositories} />
    </ActionPanel.Section>
  ) : null;
}

function ReleaseView(props: { repository: Repository }) {
  const { releases, loading, error } = useRepositoryReleases(props.repository);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed fetching repository releases",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <List isLoading={loading}>
      {releases?.map((release) => {
        const publishedAt = new Date(release.publishedAt);
        const publishedAtString = `${publishedAt.toLocaleDateString()} ${publishedAt.toLocaleTimeString()}`;

        return (
          <List.Item
            key={release.id}
            title={release.tagName}
            subtitle={release.name || ""}
            actions={
              <ActionPanel title={`${props.repository.nameWithOwner}`}>
                {release.description && (
                  <Action.Push
                    title="View Release Detail"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    icon={Icon.Eye}
                    target={
                      <Detail
                        markdown={release.description}
                        actions={
                          <ActionPanel title={`${props.repository.nameWithOwner}`}>
                            <Action.OpenInBrowser url={release.url} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                )}
                <Action.OpenInBrowser url={release.url} />
              </ActionPanel>
            }
            accessories={[
              {
                text: publishedAtString,
              },
            ]}
          />
        );
      })}
    </List>
  );
}
