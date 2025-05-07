import { Color, getPreferenceValues, Icon, launchCommand, LaunchType, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import {
  getBoundedPreferenceNumber,
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
} from "./components/Menu";
import { SortMenuBarAction } from "./components/SortAction";
import { getIssueStatus, ISSUE_DEFAULT_SORT_QUERY, ISSUE_SORT_TYPES_TO_QUERIES } from "./helpers/issue";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyIssues } from "./hooks/useMyIssues";

async function launchMyIssuesCommand(): Promise<void> {
  return launchCommand({ name: "my-issues", type: LaunchType.UserInitiated });
}

function getMaxIssuesPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function MyIssuesMenu() {
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", ISSUE_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-issue-menu",
  });
  const {
    showtext,
    showCreated,
    showAssigned,
    showMentioned,
    showRecentlyClosed,
    useUnreadIndicator,
    repositoryFilterMode,
    repositoryList,
  } = getPreferenceValues<Preferences.MyIssuesMenu>();
  const { data: sections, isLoading } = useMyIssues({
    repository: null,
    sortQuery,
    showCreated,
    showAssigned,
    showMentioned,
    showRecentlyClosed,
    filterMode: repositoryFilterMode,
    repositoryList: repositoryList?.split(",").map((r) => r.trim()) || [],
  });

  const issuesCount = sections?.reduce((acc, section) => acc + (section.issues ?? []).length, 0);

  return (
    <MenuBarRoot
      title={showtext ? `${issuesCount}` : undefined}
      icon={{
        source: `issue-open${useUnreadIndicator && issuesCount > 0 ? "-unread" : ""}.svg`,
        tintColor: Color.PrimaryText,
      }}
      isLoading={isLoading}
    >
      {sections?.map((section) => {
        return (
          <MenuBarSection
            key={section.title}
            title={section.title}
            maxChildren={getMaxIssuesPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyIssuesCommand()} />
            )}
            emptyElement={<MenuBarItem title="No Issues" />}
          >
            {section.issues?.map((i) => {
              const status = getIssueStatus(i);

              return (
                <MenuBarItem
                  key={i.id}
                  title={`#${i.number} ${i.title}`}
                  icon={{ source: status.icon.source, tintColor: Color.PrimaryText }}
                  onAction={() => open(i.url)}
                />
              );
            })}
          </MenuBarSection>
        );
      })}

      <MenuBarSection>
        <MenuBarItem
          title="Open My Issues"
          icon={Icon.AppWindowList}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchMyIssuesCommand()}
        />
        <SortMenuBarAction {...{ sortQuery, setSortQuery, data: ISSUE_SORT_TYPES_TO_QUERIES }} />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyIssuesMenu);
