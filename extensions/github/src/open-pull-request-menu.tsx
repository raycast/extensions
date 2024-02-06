import { Color, Icon, LaunchType, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  getBoundedPreferenceNumber,
} from "./components/Menu";
import View from "./components/View";
import { PullRequestFieldsFragment } from "./generated/graphql";
import { getGitHubClient } from "./helpers/withGithubClient";

async function launchMyPullRequestsCommand(): Promise<void> {
  return launchCommand({ name: "my-pull-requests", type: LaunchType.UserInitiated });
}

function displayTitlePreference() {
  const prefs = getPreferenceValues();
  const val: boolean | undefined = prefs.showtext;
  return val == undefined ? true : val;
}

function getMaxPullRequestsPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function organizeByRepoPreference() {
  const prefs = getPreferenceValues();
  const val: boolean | undefined = prefs.organizebyrepo;
  return val == undefined ? true : val;
}

function getCheckStateEmoji(pr: PullRequestFieldsFragment): string | null {
  const checkState = pr.commits.nodes ? pr.commits.nodes[0]?.commit.statusCheckRollup?.state : null;
  switch (checkState) {
    case "SUCCESS":
      return "✅";
    case "ERROR":
    case "FAILURE":
      return "⚠️";
    case "PENDING":
      return "⏱️";
    default:
      return null;
  }
}

function joinArray(ar: (string | null | undefined)[], separator: string): string {
  const d = ar?.filter((e) => e);
  return d?.join(separator) || "";
}

function OpenPullRequestMenu() {
  const { github } = getGitHubClient();

  const { data, isLoading } = useCachedPromise(
    async () => {
      const result = await github.searchPullRequests({
        query: `is:pr is:open author:@me archived:false`,
        numberOfItems: 50,
      });
      return result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
    },
    [],
    { keepPreviousData: true },
  );

  // Create list of unique repositories
  const repos = [...new Set(data?.map((i) => i.repository.nameWithOwner))];

  // TODO: Refactor the pull request MenuBarItem
  // TODO: Figure out how to handle the empty state when pull requests are sorted by repo.
  // TODO: Figure out how/if to handle the max number of items preference when pull requests are sorted by repo.
  //       Should they be sorted by repo first and then limited to the max number of items, or should the max number
  //       of items be applied to the entire list of pull requests and then sorted by repo? The former would show a
  //       ton more repos than the setting, but the latter would likely result in empty repos.

  return (
    <MenuBarRoot
      title={displayTitlePreference() ? `${data?.length}` : undefined}
      icon={{ source: "pull-request.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip="GitHub My Open Pull Requests"
    >
      <MenuBarSection title="My Pull Requests">
        <MenuBarItem
          title="Open My Pull Requests"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchMyPullRequestsCommand()}
        />
      </MenuBarSection>

      {/* Show pull requests by repo */}
      {organizeByRepoPreference() === true
        ? repos.map((repo) => (
            <MenuBarSection maxChildren={getMaxPullRequestsPreference()} key={repo} title={repo}>
              {data
                ?.filter((pr) => repo === pr.repository.nameWithOwner)
                .map((i) => {
                  // GitHub had an outage on Nov. 3rd that caused the returned PRs to be null
                  // This corrupted the cache so let's check first if there's a PR before rendering
                  if (!i) return null;
                  return (
                    <MenuBarItem
                      key={i.id}
                      title={`#${i.number} ${i.title} ${joinArray([getCheckStateEmoji(i)], "")}`}
                      icon="pull-request.svg"
                      tooltip={i.repository.nameWithOwner}
                      onAction={() => open(i.permalink)}
                    />
                  );
                })}
            </MenuBarSection>
          ))
        : data?.length === 0 && <MenuBarSection emptyElement={<MenuBarItem title="No Pull Requests" />} />}
      {/* Since the empty state is built for listing all pull requests in one MenuBarSection,
          we introduce an empty one here in case there are no pull requests available. */}

      {/* List all pull requests */}

      <MenuBarSection>
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default function Command() {
  return (
    <View>
      <OpenPullRequestMenu />
    </View>
  );
}
