/**
 * GitLab Issues Menu Bar Command for Raycast
 * -------------------------------------------
 * This file implements the menu bar command for displaying assigned GitLab issues in Raycast.
 * It fetches user preferences (such as label filters and display options), retrieves assigned issues
 * from the GitLab API, and renders them in a menu bar dropdown. Preferences are memoized to avoid
 * unnecessary re-renders and potential rendering loops.
 */

import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useMemo } from "react";
import { MenuBarItem, MenuBarItemConfigureCommand, MenuBarRoot, MenuBarSection } from "./components/menu";
import { useMyIssues } from "./components/issues_my";
import { IssueScope, IssueState } from "./components/issues";
import { GitLabIcons } from "./icons";
import { getBoundedPreferenceNumber, getPreferences } from "./utils";
import { showFailureToast } from "@raycast/utils";

async function launchMyIssues(): Promise<void> {
  try {
    return launchCommand({ name: "issue_my", type: LaunchType.UserInitiated });
  } catch (error) {
    showFailureToast(error, { title: "Could not open My Issues Command" });
  }
}

/**
 * MenuCommand renders the GitLab Issues menu bar command.
 * It reads preferences for label inclusion/exclusion and passes them to the issues API.
 */

export default function MenuCommand() {
  // Memoize preferences to avoid unnecessary re-renders and rendering loops
  const preferences = useMemo(() => getPreferences(), []);

  const { issues, isLoading, error } = useMyIssues(IssueScope.assigned_to_me, IssueState.opened, {
    includeLabels:
      preferences.includeLabels && preferences.includeLabels.trim().length > 0 ? preferences.includeLabels : undefined,
    excludeLabels:
      preferences.excludeLabels && preferences.excludeLabels.trim().length > 0 ? preferences.excludeLabels : undefined,
    ...(preferences.hideArchived === true && { non_archived: true }),
  });

  return (
    <MenuBarRoot
      isLoading={isLoading}
      title={preferences.showtext ? (issues.length <= 0 ? undefined : `${issues.length}`) : undefined}
      icon={{ source: "issues.svg", tintColor: Color.PrimaryText }}
      tooltip="GitLab Issues"
      error={error}
    >
      <MenuBarSection title="Issues">
        <MenuBarItem
          title="Open Assigned Issues"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={() => launchMyIssues()}
        />
        <MenuBarSection
          maxChildren={getBoundedPreferenceNumber(preferences.maxitems)}
          moreElement={(hidden) => (
            <MenuBarItem title={`... ${hidden} more assigned`} onAction={() => launchMyIssues()} />
          )}
        >
          {issues.map((issue) => (
            <MenuBarItem
              key={issue.iid}
              icon={{
                source: GitLabIcons.issue,
                tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
              }}
              title={`#${issue.iid} ${issue.title}`}
              tooltip={issue.reference_full}
              onAction={() => open(issue.web_url)}
            />
          ))}
        </MenuBarSection>
      </MenuBarSection>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarRoot>
  );
}
