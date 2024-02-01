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

function displayRequestReviewsPreference() {
  const prefs = getPreferenceValues();
  return prefs.showrequested == undefined ? false : prefs.showrequested;
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

  const { data: rvRequestedData, isLoading: isLoadingReviewRequested } = useCachedPromise(
    async () => {
      if (!displayRequestReviewsPreference()) {
        return null;
      }

      const result = await github.searchPullRequests({
        query: `is:open is:pr review-requested:@me archived:false `,
        numberOfItems: 50,
      });

      return result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
    },
    [],
    { keepPreviousData: true },
  );

  const amountOfMyPullRequests = data?.length ?? 0;
  const amountOfReviewRequested = rvRequestedData?.length ?? 0;
  const totalPullRequests = amountOfMyPullRequests + amountOfReviewRequested;

  const renderRequestedReviews = () => {
    if (!displayRequestReviewsPreference() || rvRequestedData?.length == 0) {
      return null;
    }

    return (
      <>
        <MenuBarSection title="Review Requested">
          <MenuBarItem
            title="Open Requested Reviews"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => launchMyPullRequestsCommand()}
          />
        </MenuBarSection>
        <MenuBarSection
          maxChildren={getMaxPullRequestsPreference()}
          moreElement={(hidden) => (
            <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPullRequestsCommand()} />
          )}
        >
          {rvRequestedData?.map((i) => (
            <MenuBarItem
              key={i.id}
              title={`#${i.number} ${i.title} ${joinArray([getCheckStateEmoji(i)], "")}`}
              icon="pull-request.svg"
              tooltip={i.repository.nameWithOwner}
              onAction={() => open(i.permalink)}
            />
          ))}
        </MenuBarSection>
      </>
    );
  };

  return (
    <MenuBarRoot
      title={displayTitlePreference() ? `${totalPullRequests}` : undefined}
      icon={{ source: "pull-request.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading || isLoadingReviewRequested}
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
      <MenuBarSection
        maxChildren={getMaxPullRequestsPreference()}
        moreElement={(hidden) => (
          <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPullRequestsCommand()} />
        )}
        emptyElement={<MenuBarItem title="No Pull Requests" />}
      >
        {data?.map((i) => {
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
      {renderRequestedReviews()}
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
