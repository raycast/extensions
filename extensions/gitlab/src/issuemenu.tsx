/**
 * GitLab Issues Menu Bar Command for Raycast
 * -------------------------------------------
 * This file implements the menu bar command for displaying assigned GitLab issues in Raycast.
 * It fetches user preferences (such as label filters and display options), retrieves assigned issues
 * from the GitLab API, and renders them in a menu bar dropdown. Preferences are memoized to avoid
 * unnecessary re-renders and potential rendering loops.
 */

import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useMemo } from "react";
import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  getBoundedPreferenceNumber,
} from "./components/menu";
import { useMyIssues } from "./components/issues_my";
import { IssueScope, IssueState } from "./components/issues";
import { GitLabIcons } from "./icons";
import { showErrorToast, getErrorMessage } from "./utils";

async function launchMyIssues(): Promise<void> {
  try {
    return launchCommand({ name: "issue_my", type: LaunchType.UserInitiated });
  } catch (error) {
    showErrorToast(getErrorMessage(error), "Could not open My Issues Command");
  }
}

/**
 * MenuCommand renders the GitLab Issues menu bar command.
 * It reads preferences for label inclusion/exclusion and passes them to the issues API.
 */

export default function MenuCommand() {
  // Memoize preferences to avoid unnecessary re-renders and rendering loops
  const preferences = useMemo(() => getPreferenceValues(), []);
  const includeLabels =
    preferences.includeLabels && preferences.includeLabels.trim().length > 0 ? preferences.includeLabels : undefined;
  const excludeLabels =
    preferences.excludeLabels && preferences.excludeLabels.trim().length > 0 ? preferences.excludeLabels : undefined;
  const showItemsCount = preferences.showtext as boolean;
  const maxIssues = getBoundedPreferenceNumber({ name: "maxitems" });

  const { issues, isLoading, error } = useMyIssues(IssueScope.assigned_to_me, IssueState.opened, undefined, {
    includeLabels,
    excludeLabels,
  });
  const assignedCount = issues?.length || 0;

  return (
    <MenuBarRoot
      isLoading={isLoading}
      title={showItemsCount ? (assignedCount <= 0 ? undefined : `${assignedCount}`) : undefined}
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
          maxChildren={maxIssues}
          moreElement={(hidden) => (
            <MenuBarItem title={`... ${hidden} more assigned`} onAction={() => launchMyIssues()} />
          )}
        >
          {issues?.map((m) => (
            <MenuBarItem
              key={m.iid}
              icon={{
                source: GitLabIcons.issue,
                tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
              }}
              title={`#${m.iid} ${m.title}`}
              tooltip={m.reference_full}
              onAction={() => open(m.web_url)}
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
