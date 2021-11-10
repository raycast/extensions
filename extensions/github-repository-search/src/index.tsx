import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  Detail,
  environment,
  Icon,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Repository } from "./types";
import { useDebounce } from "use-debounce";
import { useRepositories } from "./useRepositories";
import { clearVisitedRepositories, useVisitedRepositories } from "./useVisitedRepositories";
import { getAccessoryTitle, getIcon, getSubtitle } from "./utils";
import { useRepositoryReleases } from "./useRepositoryReleases";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [debouncedSearchText] = useDebounce(searchText, 200);
  const { data, error, isLoading: isLoadingRepositories } = useRepositories(debouncedSearchText);
  const {
    repositories: visitedRepositories,
    visitRepository,
    isLoading: isLoadingVisitedRepositories,
  } = useVisitedRepositories();

  if (error) {
    showToast(
      ToastStyle.Failure,
      "Failed searching repositories",
      error instanceof Error ? error.message : String(error)
    );
  }

  const isLoading = searchText !== debouncedSearchText || isLoadingVisitedRepositories || isLoadingRepositories;

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.Section
        title="Visited Repositories"
        subtitle={visitedRepositories ? String(visitedRepositories.length) : undefined}
      >
        {visitedRepositories
          ?.filter((r) => r.nameWithOwner.includes(searchText ?? ""))
          .map((repository) => (
            <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
          ))}
      </List.Section>
      <List.Section title="Found Repositories" subtitle={data ? String(data.repositoryCount) : undefined}>
        {data?.nodes?.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
    </List>
  );
}

function RepositoryListItem(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  return (
    <List.Item
      icon={getIcon(props.repository)}
      title={props.repository.nameWithOwner}
      subtitle={getSubtitle(props.repository)}
      accessoryTitle={getAccessoryTitle(props.repository)}
      actions={<Actions repository={props.repository} onVisit={props.onVisit} />}
    />
  );
}

function Actions(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  const { push } = useNavigation();

  return (
    <ActionPanel title={props.repository.nameWithOwner}>
      <ActionPanel.Section>
        <OpenInBrowserAction url={props.repository.url} onOpen={() => props.onVisit(props.repository)} />
        <OpenInBrowserAction
          icon={{ source: "github-dev.png", tintColor: Color.PrimaryText }}
          title="Open in Web Editor"
          url={props.repository.url.replace("https://github.com", "https://github.dev")}
          onOpen={() => props.onVisit(props.repository)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <OpenInBrowserAction
          icon={{ source: "pull-request.png", tintColor: Color.PrimaryText }}
          title="Open Pull Requests"
          url={`${props.repository.url}/pulls`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
          onOpen={() => props.onVisit(props.repository)}
        />
        {props.repository.hasIssuesEnabled && (
          <OpenInBrowserAction
            icon={{ source: "issue.png", tintColor: Color.PrimaryText }}
            title="Open Issues"
            url={`${props.repository.url}/issues`}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.hasWikiEnabled && (
          <OpenInBrowserAction
            icon={{ source: "wiki.png", tintColor: Color.PrimaryText }}
            title="Open Wiki"
            url={`${props.repository.url}/wiki`}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.hasProjectsEnabled && (
          <OpenInBrowserAction
            icon={{ source: "project.png", tintColor: Color.PrimaryText }}
            title="Open Projects"
            url={`${props.repository.url}/projects`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.releases.totalCount > 0 && (
          <ActionPanel.Item
            icon={Icon.List}
            title="Browse Releases"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => push(<ReleaseView repository={props.repository} />)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <CopyToClipboardAction
          title="Copy Repository URL"
          content={props.repository.url}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <CopyToClipboardAction
          title="Copy Name with Owner"
          content={props.repository.nameWithOwner}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <CopyToClipboardAction
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
    const toast = await showToast(ToastStyle.Animated, "Clearing visted repositories");

    try {
      await clearVisitedRepositories();
      toast.style = ToastStyle.Success;
      toast.title = "Cleared visited repositories";
    } catch (error) {
      toast.style = ToastStyle.Failure;
      toast.title = "Failed clearing visited repositories";
      toast.message = error instanceof Error ? error.message : undefined;
      console.error("Failed clearing visited repositories", error);
    }
  }

  return environment.isDevelopment ? (
    <ActionPanel.Section title="Development">
      <ActionPanel.Item
        icon={Icon.Trash}
        title="Clear Visited Repositories"
        onAction={handleClearVisitedRepositories}
      />
    </ActionPanel.Section>
  ) : null;
}

function ReleaseView(props: { repository: Repository }) {
  const { releases, loading, error } = useRepositoryReleases(props.repository);

  if (error) {
    showToast(
      ToastStyle.Failure,
      "Failed fetching repository releases",
      error instanceof Error ? error.message : String(error)
    );
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
            accessoryTitle={publishedAtString}
            actions={
              <ActionPanel title={`${props.repository.nameWithOwner}`}>
                {release.description && (
                  <PushAction
                    title="View Release Detail"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    icon={Icon.Eye}
                    target={
                      <Detail
                        markdown={release.description}
                        actions={
                          <ActionPanel title={`${props.repository.nameWithOwner}`}>
                            <OpenInBrowserAction url={release.url} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                )}
                <OpenInBrowserAction url={release.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
