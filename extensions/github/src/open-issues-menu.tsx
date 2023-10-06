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
import { IssueFieldsFragment } from "./generated/graphql";
import { getGitHubClient } from "./helpers/withGithubClient";

async function launchOpenIssuesCommand(): Promise<void> {
  return launchCommand({ name: "open-issues", type: LaunchType.UserInitiated });
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
    { keepPreviousData: true },
  );

  return (
    <MenuBarRoot
      title={displayTitlePreference() ? `${data?.length}` : undefined}
      icon={{ source: "issue-opened.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip="GitHub Open Issues"
    >
      <MenuBarSection
        title="Open Issues"
        maxChildren={getMaxIssuesPreference()}
        moreElement={(hidden) => (
          <MenuBarItem title={`... ${hidden} more`} onAction={() => launchOpenIssuesCommand()} />
        )}
      >
        <MenuBarItem
          title="Open Issues"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchOpenIssuesCommand()}
        />
      </MenuBarSection>
      <MenuBarSection
        maxChildren={getMaxIssuesPreference()}
        moreElement={(hidden) => (
          <MenuBarItem title={`... ${hidden} more`} onAction={() => launchOpenIssuesCommand()} />
        )}
        emptyElement={<MenuBarItem title="No Issues" />}
      >
        {data?.map((i) => (
          <MenuBarItem
            key={i.id}
            title={`#${i.number} ${i.title}`}
            icon="issue-opened.svg"
            tooltip={i.repository.nameWithOwner}
            onAction={() => open(i.url)}
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
      <OpenIssuesMenu />
    </View>
  );
}
