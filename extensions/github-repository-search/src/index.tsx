import { ActionPanel, Color, Detail, Icon, List, Action, Image } from "@raycast/api";
import { useState } from "react";
import { Release, Repository } from "./types";
import { useDebounce } from "use-debounce";
import { useHistory } from "./history";
import { getAccessories, getIcon, getSubtitle } from "./utils";
import { OpenInWebIDEAction } from "./website";
import { preferences } from "./preferences";
import { useReleases, useRepositories, useUserData } from "./github";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const [debouncedSearchText] = useDebounce(searchText, 200);
  const { data: history, visitRepository } = useHistory(searchText, searchFilter);
  const { data: repositories, isLoading } = useRepositories(
    `${searchFilter} ${debouncedSearchText} fork:${preferences.includeForks}`
  );

  return (
    <List
      isLoading={searchText !== debouncedSearchText || isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<FilterDropdown onFilterChange={setSearchFilter} />}
    >
      <List.Section title="Visited Repositories" subtitle={history ? String(history.length) : undefined}>
        {history.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
      <List.Section
        title="Found Repositories"
        subtitle={repositories ? String(repositories.search.repositoryCount) : undefined}
      >
        {repositories?.search.nodes?.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
    </List>
  );
}

function FilterDropdown(props: { onFilterChange: (filter: string) => void }) {
  const { data, error } = useUserData();

  if (error) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Filter Repositories" onChange={props.onFilterChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item title={"All Repositories"} value={""} />
        {data && (
          <List.Dropdown.Item
            title={"My Repositories"}
            value={`user:${data.viewer.login} ${data.viewer.organizations.nodes
              .map((org) => `org:${org.login}`)
              .join(" ")}`}
          />
        )}
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {data && (
          <List.Dropdown.Item
            icon={{ source: data.viewer.avatarUrl ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            title={data.viewer.login}
            value={`user:${data.viewer.login}`}
          />
        )}
        {data?.viewer.organizations.nodes.map((org) => (
          <List.Dropdown.Item
            icon={{ source: org.avatarUrl ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            key={org.login}
            title={org.login}
            value={`org:${org.login}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function RepositoryListItem(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  return (
    <List.Item
      icon={getIcon(props.repository)}
      title={props.repository.nameWithOwner}
      subtitle={getSubtitle(props.repository)}
      accessories={getAccessories(props.repository)}
      actions={<Actions repository={props.repository} onVisit={props.onVisit} />}
    />
  );
}

function Actions(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
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
          <Action.Push
            icon={Icon.List}
            title="Browse Releases"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            target={<Releases repository={props.repository} />}
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
    </ActionPanel>
  );
}

function Releases(props: { repository: Repository }) {
  const { data, isLoading } = useReleases(props.repository);

  return (
    <List isLoading={isLoading}>
      {data?.repository.releases.nodes?.map((release) => {
        return (
          <List.Item
            key={release.id}
            title={release.name}
            subtitle={release.tagName}
            actions={
              <ActionPanel title={release.tagName}>
                {release.description && (
                  <Action.Push
                    icon={Icon.Eye}
                    title="View Release Detail"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={<ReleaseDetail release={release} />}
                  />
                )}
                <Action.OpenInBrowser url={release.url} />
              </ActionPanel>
            }
            accessories={[
              {
                date: new Date(release.publishedAt),
                tooltip: `Published at: ${new Date(release.publishedAt).toLocaleString()}`,
              },
            ]}
          />
        );
      })}
    </List>
  );
}

function ReleaseDetail(props: { release: Release }) {
  return (
    <Detail
      markdown={props.release.description}
      actions={
        <ActionPanel title={props.release.tagName}>
          <Action.OpenInBrowser url={props.release.url} />
        </ActionPanel>
      }
    />
  );
}
