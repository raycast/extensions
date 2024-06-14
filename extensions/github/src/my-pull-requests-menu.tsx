import { Color, Icon, LaunchType, getPreferenceValues, launchCommand, open } from "@raycast/api";

import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  getBoundedPreferenceNumber,
} from "./components/Menu";
import { PullRequestFieldsFragment } from "./generated/graphql";
import { displayTitle, filterSections } from "./helpers/menu-bar";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyPullRequests } from "./hooks/useMyPullRequests";

async function launchMyPullRequestsCommand(): Promise<void> {
  return launchCommand({ name: "my-pull-requests", type: LaunchType.UserInitiated });
}

function getMaxPullRequestsPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function getPullRequestStatusIcon(pr: PullRequestFieldsFragment): Icon | string {
  const pullRequestStatus = pr.commits.nodes ? pr.commits.nodes[0]?.commit.statusCheckRollup?.state : null;
  switch (pullRequestStatus) {
    case "SUCCESS":
      return Icon.Check;
    case "ERROR":
    case "FAILURE":
      return Icon.Xmark;
    case "PENDING":
      return Icon.Clock;
    default:
      return "pull-request-open.svg";
  }
}

function MyPullRequestsMenu() {
  const { data: sections, isLoading } = useMyPullRequests(null);
  const preferences = getPreferenceValues<Preferences.MyPullRequestsMenu>();

  return (
    <MenuBarRoot
      title={displayTitle(sections, "pullRequests")}
      icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
    >
      {filterSections(sections, preferences, "pullRequests").map((section) => {
        return (
          <MenuBarSection
            key={section.type}
            title={section.type}
            maxChildren={getMaxPullRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPullRequestsCommand()} />
            )}
            emptyElement={<MenuBarItem title="No Pull Requests" />}
          >
            {section.pullRequests?.map((i) => {
              // GitHub had an outage on Nov. 3rd that caused the returned PRs to be null
              // This corrupted the cache so let's check first if there's a PR before rendering
              if (!i) return null;
              return (
                <MenuBarItem
                  key={i.id}
                  title={`#${i.number} ${i.title}`}
                  icon={{ source: getPullRequestStatusIcon(i), tintColor: Color.PrimaryText }}
                  tooltip={i.repository.nameWithOwner}
                  onAction={() => open(i.permalink)}
                />
              );
            })}
          </MenuBarSection>
        );
      })}

      <MenuBarSection>
        <MenuBarItem
          title="Open My Pull Requests"
          icon={Icon.AppWindowList}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchMyPullRequestsCommand()}
        />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyPullRequestsMenu);
