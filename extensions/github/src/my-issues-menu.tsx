import { Color, Icon, LaunchType, getPreferenceValues, launchCommand, open } from "@raycast/api";

import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  getBoundedPreferenceNumber,
} from "./components/Menu";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyIssues } from "./hooks/useMyIssues";

async function launchMyIssuesCommand(): Promise<void> {
  return launchCommand({ name: "my-issues", type: LaunchType.UserInitiated });
}

function displayTitlePreference() {
  const prefs = getPreferenceValues();
  const val: boolean | undefined = prefs.showtext;
  return val == undefined ? true : val;
}

function getMaxIssuesPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function MyIssuesMenu() {
  const { data: sections, isLoading } = useMyIssues(null);

  const issuesCount = sections?.reduce((acc, section) => acc + section.issues.length, 0);

  return (
    <MenuBarRoot
      title={displayTitlePreference() ? `${issuesCount}` : undefined}
      icon={{ source: "issue-opened.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip="GitHub My Issues"
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
            {section.issues?.map((i) => (
              <MenuBarItem
                key={i.id}
                title={`#${i.number} ${i.title}`}
                icon={{ source: "issue-opened.svg", tintColor: Color.PrimaryText }}
                tooltip={i.repository.nameWithOwner}
                onAction={() => open(i.url)}
              />
            ))}
          </MenuBarSection>
        );
      })}

      <MenuBarSection>
        <MenuBarItem
          title="Open My Issues"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchMyIssuesCommand()}
        />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyIssuesMenu);
