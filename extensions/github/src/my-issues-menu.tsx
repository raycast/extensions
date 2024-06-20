import { Color, getPreferenceValues, Icon, launchCommand, LaunchType, open } from "@raycast/api";

import {
  getBoundedPreferenceNumber,
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
} from "./components/Menu";
import { getIssueStatus } from "./helpers/issue";
import { displayTitle, filterSections } from "./helpers/menu-bar";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyIssues } from "./hooks/useMyIssues";

async function launchMyIssuesCommand(): Promise<void> {
  return launchCommand({ name: "my-issues", type: LaunchType.UserInitiated });
}

function getMaxIssuesPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function MyIssuesMenu() {
  const { data: sections, isLoading } = useMyIssues(null);
  const preferences = getPreferenceValues<Preferences.MyIssuesMenu>();

  return (
    <MenuBarRoot
      title={displayTitle(sections, "issues")}
      icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
    >
      {filterSections(sections, preferences, "issues").map((section) => {
        return (
          <MenuBarSection
            key={section.type}
            title={section.type}
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
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyIssuesMenu);
