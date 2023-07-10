import { LaunchType, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { MenuBarItem, MenuBarRoot, MenuBarSection, getBoundedPreferenceNumber } from "./components/Menu";
import View from "./components/View";
import { IssueFieldsFragment } from "./generated/graphql";
import { getGitHubClient } from "./helpers/withGithubClient";

async function launchIssuesCommand(): Promise<void> {
  return launchCommand({ name: "search-issues", type: LaunchType.UserInitiated });
}

function displayTitlePreference() {
  const prefs = getPreferenceValues();
  const val: boolean | undefined = prefs.showtext;
  return val == undefined ? true : val;
}

function getMaxIssuesPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function OpenIssuesMenu() {
  const { github } = getGitHubClient();

  const { data, isLoading } = useCachedPromise(
    async () => {
      const result = await github.searchIssues({
        query: `is:issue is:open assignee:@me archived:false`,
        numberOfItems: 50,
      });

      return result.search.nodes?.map((node) => node as IssueFieldsFragment);
    },
    [],
    { keepPreviousData: true }
  );

  return (
    <MenuBarRoot
      title={displayTitlePreference() ? `${data?.length}` : undefined}
      icon="issue-opened.svg"
      isLoading={isLoading}
      tooltip="GitHub Open Issues"
    >
      <MenuBarSection
        title="Issues"
        maxChildren={getMaxIssuesPreference()}
        moreElement={(hidden) => <MenuBarItem title={`... ${hidden} more`} onAction={() => launchIssuesCommand()} />}
      >
        {data?.length || (0 <= 0 && <MenuBarItem title="No Issues" onAction={() => launchIssuesCommand()} />)}
        {data?.map((i) => (
          <MenuBarItem
            key={i.id}
            title={`#${i.number} ${i.title}`}
            icon="issue-opened.svg"
            onAction={() => open(i.url)}
          />
        ))}
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default function Command() {
  return (
    <View>
      <OpenIssuesMenu />
    </View>
  );
}
