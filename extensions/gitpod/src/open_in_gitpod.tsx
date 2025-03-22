import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { GitpodIcons, UIColors } from "../constants";

import { WorkspaceManager } from "./api/Gitpod/WorkspaceManager";
import BranchListItem from "./components/BranchListItem";
import DefaultOrgForm from "./components/DefaultOrgForm";
import IssueListItem from "./components/IssueListItem";
import PullRequestListItem from "./components/PullRequestListItem";
import RepositoryListEmptyView from "./components/RepositoryListEmptyView";
import RepositoryListItem from "./components/RepositoryListItem";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import View from "./components/View";
import { errorMessage } from "./components/errorListView";
import { ExtendedRepositoryFieldsFragment } from "./generated/graphql";
import { useBranchHistory } from "./helpers/branch";
import createWorksapceFromContext from "./helpers/createWorkspaceFromContext";
import { useIssueHistory } from "./helpers/issue";
import OpenInGitpod, { getPreferencesForContext } from "./helpers/openInGitpod";
import { usePullReqHistory } from "./helpers/pull-request";
import { useHistory } from "./helpers/repository";
import { getGitHubClient } from "./helpers/withGithubClient";
import { dashboardPreferences } from "./preferences/dashboard_preferences";
import RepositoryPreference from "./preferences/repository_preferences";

function SearchRepositories() {
  const { github } = getGitHubClient();

  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const { data: history, visitRepository, removeRepository } = useHistory(searchText, searchFilter);
  const { history: visitedPullReqs, removePullReq } = usePullReqHistory();
  const { history: visitedBranches, removeBranch } = useBranchHistory();
  const { history: visitedIssues, removeIssue } = useIssueHistory();

  const [gitpodArray, setGitpodArray] = useState<string[]>();
  const query = useMemo(() => `${searchFilter} ${searchText} fork:true`, [searchText, searchFilter]);
  const dashboardPreferences = getPreferenceValues<dashboardPreferences>();
  const workspaceManager = new WorkspaceManager(dashboardPreferences.access_token ?? "");

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (query) => {
      await workspaceManager.init();
      const result = await github.searchRepositories({ query, numberOfItems: 10 });
      return result.search.nodes?.map((node) => node as ExtendedRepositoryFieldsFragment);
    },
    [query],
    {
      keepPreviousData: true,
      onError(error: Error) {
        const e = error as any as { code: string };
        showToast({
          title: e.code === "ENOTFOUND" ? errorMessage.networkError : error.message,
          style: Toast.Style.Failure,
        });
      },
    }
  );

  const gitpodFilter = async (repo: ExtendedRepositoryFieldsFragment[]) => {
    const result = [];
    for (const node of repo) {
      const res = await github.isRepositoryGitpodified({ owner: node.owner.login, name: node.name });
      if (res.repository?.content) {
        result.push(node.name);
      }
    }
    return result;
  };

  const foundRepositories = useMemo(() => {
    const found = data?.filter((repository) => !history.find((r) => r.id === repository.id));
    if (found) {
      gitpodFilter(found.slice(0, 6)).then((result) => {
        setGitpodArray(result);
      });
    }
    return found;
  }, [data]);

  const { data: preferences, revalidate } = usePromise(async () => {
    const response = await getPreferencesForContext("Repository", "gitpod-io/empty");
    return response;
  });

  const { push } = useNavigation();

  const accessoriesEmptyRepo: List.Item.Accessory[] = [
    {
      text: {
        value: preferences?.preferredEditorClass === "g1-large" ? "L" : "S",
      },
      icon: {
        source: Icon.ComputerChip,
        tintColor: UIColors.gitpod_gold,
      },
      tooltip: `Editor: ${preferences?.preferredEditor}, Class: ${preferences?.preferredEditorClass} `,
    },
    {
      icon: GitpodIcons.gitpod_logo_primary,
    },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in public and private repositories"
      onSearchTextChange={setSearchText}
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      throttle
    >
      <List.Item
        title={"Empty Workspace"}
        accessories={accessoriesEmptyRepo}
        icon={"https://avatars.githubusercontent.com/u/37021919?s=64&v=4"}
        actions={
          <ActionPanel>
            <Action
              title="Start an Empty Workspace"
              onAction={async () => {
                if (dashboardPreferences.access_token !== undefined && dashboardPreferences.access_token !== "") {
                  const defaultOrg = await LocalStorage.getItem("default_organization");
                  if (defaultOrg !== undefined && WorkspaceManager.api) {
                    createWorksapceFromContext(defaultOrg.toString(), "https://github.com/gitpod-io/empty");
                  } else {
                    push(<DefaultOrgForm />);
                  }
                } else {
                  OpenInGitpod("https://github.com/gitpod-io/empty", "Repository", "gitpod-io/empty");
                }
              }}
            />
            <Action
              title="Configure Workspace"
              onAction={() => push(<RepositoryPreference revalidate={revalidate} repository={"gitpod-io/empty"} />)}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel>
        }
      />
      {searchText == "" && (
        <List.Section
          title="Recent Contexts"
          subtitle={
            visitedBranches || visitedPullReqs || visitedIssues
              ? String(visitedBranches?.length + visitedPullReqs?.length + visitedIssues?.length)
              : undefined
          }
        >
          {visitedBranches.map((branchCache, index) => {
            return (
              <BranchListItem
                branch={branchCache.branch}
                repository={branchCache.repository}
                key={index}
                removeBranch={removeBranch}
                fromCache={true}
              />
            );
          })}
          {visitedPullReqs.map((pullRequest) => (
            <PullRequestListItem
              key={pullRequest.id}
              pullRequest={pullRequest}
              fromCache={true}
              removePullReq={removePullReq}
            />
          ))}
          {visitedIssues.map((issue) => (
            <IssueListItem key={issue.id} issue={issue} fromCache={true} removeIssue={removeIssue} />
          ))}
        </List.Section>
      )}
      <List.Section title="Recent Repositories" subtitle={history ? String(history.length) : undefined}>
        {history.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            isGitpodified={gitpodArray?.includes(repository.name) ?? false}
            repository={repository}
            onVisit={visitRepository}
            mutateList={mutateList}
            fromCache={true}
            removeRepository={removeRepository}
          />
        ))}
      </List.Section>

      {foundRepositories ? (
        <List.Section
          title={searchText ? "Search Results" : "Found Repositories"}
          subtitle={`${foundRepositories.length}`}
        >
          {foundRepositories.map((repository) => {
            return (
              <RepositoryListItem
                key={repository.id}
                isGitpodified={gitpodArray?.includes(repository.name) ?? false}
                repository={repository}
                mutateList={mutateList}
                onVisit={visitRepository}
              />
            );
          })}
        </List.Section>
      ) : null}

      <RepositoryListEmptyView searchText={searchText} isLoading={isLoading} />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchRepositories />
    </View>
  );
}
