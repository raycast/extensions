import { List, Toast, showToast, Cache } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import BranchListItem from "./components/BranchListItem";
import IssueListItem from "./components/IssueListItem";
import PullRequestListItem from "./components/PullRequestListItem";
import View from "./components/View";
import {
  BranchDetailsFragment,
  ExtendedRepositoryFieldsFragment,
  IssueFieldsFragment,
  PullRequestFieldsFragment,
} from "./generated/graphql";
import { pluralize } from "./helpers";
import { useBranchHistory } from "./helpers/branch";
import { useIssueHistory } from "./helpers/issue";
import { usePullReqHistory } from "./helpers/pull-request";
import { useContextHistory } from "./helpers/recent";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

type SearchContextProps = {
  repository: ExtendedRepositoryFieldsFragment;
};

function SearchContext({ repository }: SearchContextProps) {
  const { history: cachedContexts, addRepoContext } = useContextHistory();
  const cachedRepo = cachedContexts.find((ctx) => ctx.repoName === repository.nameWithOwner);

  const { github } = getGitHubClient();
  const viewer = useViewer();
  const { visitPullReq } = usePullReqHistory();
  const { visitBranch } = useBranchHistory();
  const { visitIssue } = useIssueHistory();
  const [sections, setSections] = useState(["/b", "/i", "/p"]);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [forAuthor, setForAuthor] = useState(false);

  const [firstLoad, setfirstLoad] = useState(true);

  const changeBodyVisibility = (state: boolean) => {
    setBodyVisible(state);
  };

  const { data, isLoading: isPRLoading } = usePromise(
    async (searchText, sections, cachedRepo, firstLoad) => {
      if (!cachedRepo || !firstLoad) {
        const result: {
          pullRequest?: PullRequestFieldsFragment[] | undefined;
          issues?: IssueFieldsFragment[] | undefined;
          branches?: BranchDetailsFragment[] | undefined;
        } = {};

        let n = 2;
        if (sections.length == 1) {
          n = 10;
        } else if (sections.length == 2) {
          n = 3;
        }

        if (sections.includes("/p")) {
          const pullRequest = (
            await github.searchPullRequests({
              query: `is:pr repo:${repository.nameWithOwner} ${
                forAuthor ? "author:@me" : ""
              } archived:false ${searchText.trim()}`,
              numberOfItems: n,
            })
          ).search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
          result.pullRequest = pullRequest;
        }

        if (sections.includes("/i")) {
          const issues = (
            await github.searchIssues({
              query: `is:issue repo:${repository.nameWithOwner} ${
                forAuthor ? "author:@me" : ""
              } archived:false ${searchText.trim()}`,
              numberOfItems: n,
            })
          ).search.nodes?.map((node) => node as IssueFieldsFragment);
          result.issues = issues;
        }

        if (sections.includes("/b")) {
          const branches = (
            await github.getExistingRepoBranches({
              orgName: forAuthor && viewer?.login ? viewer.login : repository.owner.login,
              repoName: repository.name,
              branchQuery: searchText.trim(),
              defaultBranch: repository.defaultBranchRef?.defaultBranch ?? "main",
              numberOfItems: n,
            })
          ).repository?.refs?.edges?.map((edge) => edge?.node as BranchDetailsFragment);
          result.branches = branches;
        }

        if (searchText !== "") {
          addRepoContext({ repoName: repository.nameWithOwner, contexts: result });
        } else if (!cachedRepo) {
          addRepoContext({ repoName: repository.nameWithOwner, contexts: result });
        }

        return result;
      }
    },
    [searchText, sections, cachedRepo, firstLoad],
    {
      onError(error) {
        showToast({
          title: error.message,
          style: Toast.Style.Failure,
        });
      },
    }
  );

  const arr = ["/b", "/i", "/p"];

  const parseSearchOptions = (searchDat: string) => {
    const chunks: string[] = searchDat.split(" ");
    const option: string[] = [];
    let isAuthor = false;
    const searchString: string[] = [];
    chunks.forEach((chunk) => {
      if (chunk[0] === "/" && arr.includes(chunk.toLocaleLowerCase())) {
        option.push(chunk.toLocaleLowerCase());
      } else if (chunk[0] === "/" && chunk === "/me") {
        isAuthor = true;
      } else {
        searchString.push(chunk);
      }
    });

    if (option.length === 0) {
      setSections(arr);
    } else {
      setSections(option);
    }
    const searchChunk = searchString.join(" ");
    setForAuthor(isAuthor);
    if (searchChunk === "") {
      setSearchText(" ");
    } else {
      setSearchText(searchChunk.trim());
    }
  };

  useEffect(() => {
    if (firstLoad && searchText !== "") {
      setfirstLoad(false);
    }
  }, [searchText]);

  if (firstLoad && cachedRepo?.contexts) {
    return (
      <List
        searchBarPlaceholder="Filter `/me` for your stuff, `/b` for branches, `/p` for Pull Request, `/i` for issues"
        isLoading={isPRLoading}
        onSearchTextChange={parseSearchOptions}
        isShowingDetail={bodyVisible}
        navigationTitle={repository.nameWithOwner}
        throttle
      >
        {cachedRepo.contexts.branches && (
          <List.Section
            key={"Branches"}
            title={"Branches"}
            subtitle={pluralize(cachedRepo.contexts.branches.length, "Branch", {
              withNumber: true,
            })}
          >
            {cachedRepo.contexts.branches.map((branch) => {
              return (
                <BranchListItem
                  bodyVisible={bodyVisible}
                  changeBodyVisibility={changeBodyVisibility}
                  repositoryOwner={repository.owner.login}
                  repositoryWithoutOwner={repository.name}
                  key={branch.branchName}
                  repositoryLogo={repository.owner.avatarUrl}
                  mainBranch={repository.defaultBranchRef?.defaultBranch ?? ""}
                  repository={forAuthor ? `${viewer?.login}/${repository.name}` : repository.nameWithOwner}
                  branch={branch}
                  visitBranch={visitBranch}
                />
              );
            })}
          </List.Section>
        )}
        {cachedRepo.contexts.pullRequest && (
          <List.Section
            key={"Pull Requests"}
            title={"Pull Requests"}
            subtitle={pluralize(cachedRepo.contexts.pullRequest.length, "Pull Request", {
              withNumber: true,
            })}
          >
            {cachedRepo.contexts.pullRequest.map((pullRequest) => {
              return (
                <PullRequestListItem
                  bodyVisible={bodyVisible}
                  changeBodyVisibility={changeBodyVisibility}
                  key={pullRequest.id}
                  pullRequest={pullRequest}
                  viewer={viewer}
                  visitPullReq={visitPullReq}
                />
              );
            })}
          </List.Section>
        )}
        {cachedRepo.contexts.issues && (
          <List.Section
            key={"Issues"}
            title={"Issues"}
            subtitle={pluralize(cachedRepo.contexts.issues.length, "Issue", {
              withNumber: true,
            })}
          >
            {cachedRepo.contexts.issues.map((issue) => {
              return (
                <IssueListItem
                  bodyVisible={bodyVisible}
                  changeBodyVisibility={changeBodyVisibility}
                  key={issue.id}
                  issue={issue}
                  viewer={viewer}
                  visitIssue={visitIssue}
                />
              );
            })}
          </List.Section>
        )}
      </List>
    );
  }

  return (
    <List
      isShowingDetail={bodyVisible}
      isLoading={isPRLoading}
      searchBarPlaceholder="Filter `/me` for your stuff, `/b` for branches, `/p` for Pull Request, `/i` for issues"
      onSearchTextChange={parseSearchOptions}
      navigationTitle={repository.nameWithOwner}
      throttle
    >
      {sections.includes("/b") && data?.branches !== undefined && (
        <List.Section
          key={"Branches"}
          title={"Branches"}
          subtitle={pluralize(data?.branches.length, "Branch", { withNumber: true })}
        >
          {data.branches.map((branch) => {
            return (
              <BranchListItem
                bodyVisible={bodyVisible}
                changeBodyVisibility={changeBodyVisibility}
                key={branch.branchName}
                repositoryLogo={repository.owner.avatarUrl}
                repositoryOwner={repository.owner.login}
                repositoryWithoutOwner={repository.name}
                mainBranch={repository.defaultBranchRef?.defaultBranch ?? ""}
                repository={forAuthor ? `${viewer?.login}/${repository.name}` : repository.nameWithOwner}
                branch={branch}
                visitBranch={visitBranch}
              />
            );
          })}
        </List.Section>
      )}

      {sections.includes("/p") && data?.pullRequest !== undefined && (
        <List.Section
          key={"Pulls"}
          title={"Pull Requests"}
          subtitle={pluralize(data?.pullRequest.length, "Pull Request", { withNumber: true })}
        >
          {data.pullRequest.map((pullRequest) => {
            if (!pullRequest.closed) {
              return (
                <PullRequestListItem
                  bodyVisible={bodyVisible}
                  changeBodyVisibility={changeBodyVisibility}
                  key={pullRequest.id}
                  pullRequest={pullRequest}
                  viewer={viewer}
                  visitPullReq={visitPullReq}
                />
              );
            }
          })}
        </List.Section>
      )}

      {sections.includes("/i") && data?.issues !== undefined && (
        <List.Section
          key={"Issues"}
          title={"Issues"}
          subtitle={pluralize(data?.issues.length, "Issue", { withNumber: true })}
        >
          {data.issues.map((issue) => {
            return (
              <IssueListItem
                bodyVisible={bodyVisible}
                changeBodyVisibility={changeBodyVisibility}
                key={issue.id}
                issue={issue}
                viewer={viewer}
                visitIssue={visitIssue}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default function Command({ repository }: SearchContextProps) {
  return (
    <View>
      <SearchContext repository={repository} />
    </View>
  );
}
