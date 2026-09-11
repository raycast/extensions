import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { OAuthService, getAccessToken, withAccessToken } from "@raycast/utils";
import type { Repository } from "@/types";
import { useRepositories } from "@/hooks/useRepositories";
import { useRepositoryReleases } from "@/hooks/useRepositoryReleases";
import { clearVisitedRepositories, useVisitedRepositories } from "@/hooks/useVisitedRepositories";
import { OpenInWebIDEAction } from "@/components/website";
import { getAccessoryTitle, getIcon, getSubtitle } from "@/utils";

const github = OAuthService.github({
  scope: "repo read:org read:user",
  personalAccessToken: getPreferenceValues<{ token?: string }>().token || undefined,
});

function CommandInner() {
  const { token } = getAccessToken();
  const { baseUrl } = getPreferenceValues<{ baseUrl?: string }>();
  const [searchText, setSearchText] = useState<string>();
  const [debouncedSearchText] = useDebounce(searchText, 200);
  const { data, error, isLoading: isLoadingRepositories } = useRepositories(debouncedSearchText, token, baseUrl);
  const {
    repositories: visitedRepositories,
    visitRepository,
    isLoading: isLoadingVisitedRepositories,
  } = useVisitedRepositories();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed searching repositories",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [error]);

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
            <RepositoryListItem
              key={repository.id}
              repository={repository}
              onVisit={visitRepository}
              token={token}
              baseUrl={baseUrl}
            />
          ))}
      </List.Section>
      <List.Section title="Found Repositories" subtitle={data ? String(data.repositoryCount) : undefined}>
        {data?.nodes?.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            repository={repository}
            onVisit={visitRepository}
            token={token}
            baseUrl={baseUrl}
          />
        ))}
      </List.Section>
    </List>
  );
}

export default withAccessToken(github)(CommandInner);

function RepositoryListItem(props: {
  repository: Repository;
  onVisit: (repository: Repository) => void;
  token: string;
  baseUrl?: string;
}) {
  return (
    <List.Item
      icon={getIcon(props.repository)}
      title={props.repository.nameWithOwner}
      subtitle={getSubtitle(props.repository)}
      actions={
        <Actions repository={props.repository} onVisit={props.onVisit} token={props.token} baseUrl={props.baseUrl} />
      }
      accessories={[
        {
          text: getAccessoryTitle(props.repository),
        },
      ]}
    />
  );
}

function Actions(props: {
  repository: Repository;
  onVisit: (repository: Repository) => void;
  token: string;
  baseUrl?: string;
}) {
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
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.hasProjectsEnabled && (
          <Action.OpenInBrowser
            icon={{ source: "project.png", tintColor: Color.PrimaryText }}
            title="Open Projects"
            url={`${props.repository.url}/projects`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.releases?.totalCount > 0 && (
          <Action
            icon={Icon.List}
            title="Browse Releases"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() =>
              push(<ReleaseView repository={props.repository} token={props.token} baseUrl={props.baseUrl} />)
            }
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
      title: "Clearing visited repositories",
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

function ReleaseView(props: { repository: Repository; token: string; baseUrl?: string }) {
  const { releases, loading, error } = useRepositoryReleases(props.repository, props.token, props.baseUrl);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed fetching repository releases",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [error]);

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
