import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  environment,
  getPreferenceValues,
  open,
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
  onVisit: (repository: Repository) => Promise<void>;
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
  onVisit: (repository: Repository) => Promise<void>;
  token: string;
  baseUrl?: string;
}) {
  const { push } = useNavigation();

  async function openRepository(url: string) {
    await props.onVisit(props.repository);
    await open(url);
    await closeMainWindow();
  }

  return (
    <ActionPanel title={props.repository.nameWithOwner}>
      <ActionPanel.Section>
        <Action title="Open in Browser" icon={Icon.Globe} onAction={() => openRepository(props.repository.url)} />
        <OpenInWebIDEAction repository={props.repository} onOpen={openRepository} />
        <Action.OpenInBrowser
          icon="vscode-action-icon.png"
          title="Clone in VS Code"
          url={`vscode://vscode.git/clone?url=${props.repository.url}`}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={{ source: "pull-request.png", tintColor: Color.PrimaryText }}
          title="Open Pull Requests"
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={() => openRepository(`${props.repository.url}/pulls`)}
        />
        {props.repository.hasIssuesEnabled && (
          <Action
            icon={{ source: "issue.png", tintColor: Color.PrimaryText }}
            title="Open Issues"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "i" },
              Windows: { modifiers: ["ctrl"], key: "i" },
            }}
            onAction={() => openRepository(`${props.repository.url}/issues`)}
          />
        )}
        {props.repository.hasWikiEnabled && (
          <Action
            icon={{ source: "wiki.png", tintColor: Color.PrimaryText }}
            title="Open Wiki"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "w" },
              Windows: { modifiers: ["ctrl", "shift"], key: "w" },
            }}
            onAction={() => openRepository(`${props.repository.url}/wiki`)}
          />
        )}
        {props.repository.hasProjectsEnabled && (
          <Action
            icon={{ source: "project.png", tintColor: Color.PrimaryText }}
            title="Open Projects"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "p" },
              Windows: { modifiers: ["ctrl", "shift"], key: "p" },
            }}
            onAction={() => openRepository(`${props.repository.url}/projects`)}
          />
        )}
        {props.repository.releases?.totalCount > 0 && (
          <Action
            icon={Icon.List}
            title="Browse Releases"
            shortcut={Keyboard.Shortcut.Common.Refresh}
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
          shortcut={Keyboard.Shortcut.Common.Pin}
        />
        <Action.CopyToClipboard
          title="Copy Name with Owner"
          content={props.repository.nameWithOwner}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "." },
            Windows: { modifiers: ["ctrl", "shift"], key: "." },
          }}
        />
        <Action.CopyToClipboard
          title="Copy Clone Command"
          content={`git clone ${props.repository.url}`}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "," },
            Windows: { modifiers: ["ctrl", "shift"], key: "," },
          }}
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
                    shortcut={Keyboard.Shortcut.Common.Refresh}
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
