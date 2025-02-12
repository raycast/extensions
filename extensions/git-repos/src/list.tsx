import {
  Action,
  ActionPanel,
  Application,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  open,
} from "@raycast/api";

import path from "path";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { GitRepo, Preferences, tildifyPath, GitRepoService, GitRepoType, OpenWith } from "./utils";
import { useUsageBasedSort } from "./hooks/useUsageBasedSort";

const installedBrowsers = GetInstalledBrowsers().map(
  // Safari gets found in /Applications here but actually exists in
  // /System/Volumes/Preboot/Cryptexes/App/System/Applications, so strip the
  // rest of the path for all browsers
  (browser) => path.basename(path.dirname(path.dirname(path.dirname(browser.path))))
);

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const gitReposState = useCachedPromise(GitRepoService.gitRepos);
  const favoriteGitReposState = useCachedPromise(GitRepoService.favorites);

  const favoriteGitRepos = gitReposState.data?.filter((gitRepo) =>
    favoriteGitReposState.data?.includes(gitRepo.fullPath)
  );

  const repoTypes = Object.keys(GitRepoType)
    .filter((key) => isNaN(Number(key)) && (preferences.includeSubmodules || key !== GitRepoType.Submodule))
    .map((repoType) => repoType as GitRepoType);
  const [currentRepoType, onRepoTypeChange] = useState(GitRepoType.All);

  const gitRepos = gitReposState.data?.filter((gitRepo) => !favoriteGitReposState.data?.includes(gitRepo.fullPath));
  const { data: sortedGitRepos, recordUsage } = useUsageBasedSort<GitRepo>(gitRepos || [], "gitRepos");

  return (
    <List
      isLoading={gitReposState.isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={<GitRepoPropertyDropdown repoTypes={repoTypes} onRepoTypeChange={onRepoTypeChange} />}
    >
      <List.Section title="Favorites">
        {favoriteGitRepos
          ?.filter((repo) => currentRepoType === GitRepoType.All || currentRepoType === repo.repoType)
          .map((repo) => (
            <GitRepoListItem
              key={repo.fullPath}
              preferences={preferences}
              repo={repo}
              isFavorite={true}
              revalidate={favoriteGitReposState.revalidate}
            />
          ))}
      </List.Section>
      <List.Section title={favoriteGitRepos?.length ? "Repos" : undefined}>
        {sortedGitRepos
          ?.filter((repo) => currentRepoType === GitRepoType.All || currentRepoType === repo.repoType)
          .map((repo) => (
            <GitRepoListItem
              key={repo.fullPath}
              preferences={preferences}
              repo={repo}
              isFavorite={false}
              revalidate={favoriteGitReposState.revalidate}
              recordUsageHook={recordUsage}
            />
          ))}
      </List.Section>
    </List>
  );
}

function GitRepoListItem(props: {
  preferences: Preferences;
  repo: GitRepo;
  isFavorite: boolean;
  revalidate: () => void;
  recordUsageHook?: (id: string | number) => void;
}): JSX.Element {
  const preferences = props.preferences;
  const repo = props.repo;
  const isFavorite = props.isFavorite;
  const tildifiedPath = tildifyPath(repo.fullPath);
  const keywords = (() => {
    switch (preferences.searchKeys) {
      default:
      case "name":
        return [repo.name];
      case "fullPath":
        return tildifiedPath.split(path.sep);
    }
  })();

  return (
    <List.Item
      title={repo.name}
      icon={repo.icon}
      accessories={[{ text: tildifiedPath }]}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitRepoOpenAction openWith={preferences.openWith1} repo={repo} recordUsageHook={props.recordUsageHook} />
            <GitRepoOpenAction openWith={preferences.openWith2} repo={repo} recordUsageHook={props.recordUsageHook} />
            {preferences.openWith3 && (
              <GitRepoOpenAction
                openWith={preferences.openWith3}
                repo={repo}
                recordUsageHook={props.recordUsageHook}
                shortcut={{ modifiers: ["opt"], key: "return" }}
              />
            )}
            {preferences.openWith4 && (
              <GitRepoOpenAction
                openWith={preferences.openWith4}
                repo={repo}
                recordUsageHook={props.recordUsageHook}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
              />
            )}
            {preferences.openWith5 && (
              <GitRepoOpenAction
                openWith={preferences.openWith5}
                repo={repo}
                recordUsageHook={props.recordUsageHook}
                shortcut={{ modifiers: ["shift"], key: "return" }}
              />
            )}
            <Action
              title="Open in All Applications"
              icon={Icon.ChevronUp}
              onAction={() => {
                // checking for app != null to not open in default app
                function openIn(application?: Application) {
                  if (application != null) {
                    open(getTarget(repo, application), application.bundleId);
                  }
                }
                // awaiting all opens doesn't seem to work
                // it gets stuck when opening with Finder
                openIn(preferences.openWith1);
                openIn(preferences.openWith2);
                openIn(preferences.openWith3);
                openIn(preferences.openWith4);
                openIn(preferences.openWith5);
              }}
            />
            <Action.OpenWith path={repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={async () => {
                if (props.isFavorite) {
                  // Remove from favorites
                  await GitRepoService.removeFromFavorites(repo);
                } else {
                  // Add to favorites
                  await GitRepoService.addToFavorites(repo);
                }
                // Revalidate
                props.revalidate();
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {repo.remotes.map((remote) => {
              let shortcut = undefined as Keyboard.Shortcut | undefined;
              switch (remote.name) {
                case "origin":
                  shortcut = { modifiers: ["shift", "cmd"], key: "o" };
                  break;
                case "upstream":
                  shortcut = { modifiers: ["shift", "cmd"], key: "u" };
                  break;

                default:
                  break;
              }

              let icon = undefined as Image | undefined;
              let host = remote.host;
              switch (remote.host) {
                case "github.com":
                  icon = { source: "github-icon.png", tintColor: Color.PrimaryText };
                  host = "GitHub";
                  break;
                case "gitlab.com":
                  icon = { source: "gitlab-icon.png", tintColor: Color.PrimaryText };
                  host = "GitLab";
                  break;
                case "bitbucket.org":
                  icon = { source: "bitbucket-icon.png", tintColor: Color.PrimaryText };
                  host = "Bitbucket";
                  break;

                default:
                  break;
              }
              if (remote.host === "github.com") {
                return (
                  <ActionPanel.Submenu
                    title={`Open ${remote.name} on ${host}`}
                    key={`GitHub_${remote.name}`}
                    icon={icon ?? Icon.Globe}
                    shortcut={shortcut}
                  >
                    <Action.OpenInBrowser
                      title={`Code`}
                      key={`code ${remote.name}`}
                      url={remote.url}
                      icon={{ source: "github-code-icon.png", tintColor: Color.PrimaryText }}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title={`Issues`}
                      key={`issues ${remote.name}`}
                      url={`${remote.url}/issues`}
                      icon={{ source: "github-issues-icon.png", tintColor: Color.PrimaryText }}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
                    />
                    <Action.OpenInBrowser
                      title={`Pull Requests`}
                      key={`pulls ${remote.name}`}
                      url={`${remote.url}/pulls`}
                      icon={{ source: "github-pulls-icon.png", tintColor: Color.PrimaryText }}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
                    />
                  </ActionPanel.Submenu>
                );
              } else {
                return (
                  <Action.OpenInBrowser
                    title={`Open ${remote.name} on ${host}`}
                    key={`open remote ${remote.name}`}
                    url={remote.url}
                    shortcut={shortcut}
                    icon={icon ?? Icon.Globe}
                  />
                );
              }
            })}
            <Action.CopyToClipboard
              title={"Copy Path to Clipboard"}
              content={repo.fullPath}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function GitRepoPropertyDropdown(props: {
  repoTypes: GitRepoType[];
  onRepoTypeChange: (newValue: GitRepoType) => void;
}): JSX.Element {
  const { repoTypes, onRepoTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter repo type"
      storeValue={true}
      onChange={(newValue) => {
        onRepoTypeChange(newValue as GitRepoType);
      }}
    >
      {repoTypes
        .map((repoType) => GitRepoType[repoType])
        .map((repoType) => (
          <List.Dropdown.Item key={repoType} title={repoType} value={repoType} />
        ))}
    </List.Dropdown>
  );
}

function GitRepoOpenAction(props: {
  repo: GitRepo;
  openWith: OpenWith;
  shortcut?: Keyboard.Shortcut;
  recordUsageHook?: (id: string | number) => void;
}): JSX.Element {
  return (
    <Action.Open
      title={`Open in ${props.openWith.name}`}
      icon={{ fileIcon: props.openWith.path }}
      target={`${getTarget(props.repo, props.openWith)}`}
      application={props.openWith.bundleId}
      shortcut={props.shortcut}
      onOpen={() => props.recordUsageHook?.(props.repo.name)}
    />
  );
}

function getTarget(repo: GitRepo, app: Application): string {
  // Should it return the repo fullPath or url?
  if (
    repo.remotes.length > 0 &&
    repo.remotes[0].url.length > 0 &&
    (app.bundleId?.toLowerCase() === repo.defaultBrowserId.toLowerCase() ||
      installedBrowsers.includes(path.basename(app.path)))
  ) {
    return repo.remotes[0].url;
  }
  return repo.fullPath;
}
