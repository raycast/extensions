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
      <MenuBarSection
        maxChildren={getMaxPullRequestsPreference()}
        moreElement={(hidden) => (
          <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPullRequestsCommand()} />
        )}
        emptyElement={<MenuBarItem title="No Pull Requests" />}
      >
        {data?.map((i) => (
          <MenuBarItem
            key={i.id}
            title={`#${i.number} ${i.title} ${joinArray([getCheckStateEmoji(i)], "")}`}
            icon="pull-request.svg"
            tooltip={i.repository.nameWithOwner}
            onAction={() => open(i.permalink)}
          />
        ))}
      </MenuBarSection>
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
