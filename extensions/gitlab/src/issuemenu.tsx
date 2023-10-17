import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
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

function getMaxIssuesPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function getShowItemsCountPreference(): boolean {
  const prefs = getPreferenceValues();
  const result = prefs.showtext as boolean;
  return result;
}

export default function MenuCommand(): JSX.Element {
  const { issues, isLoading, error } = useMyIssues(IssueScope.assigned_to_me, IssueState.opened, undefined);
  const assignedCount = issues?.length || 0;

  return (
    <MenuBarRoot
      isLoading={isLoading}
      title={getShowItemsCountPreference() ? (assignedCount <= 0 ? undefined : `${assignedCount}`) : undefined}
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
          maxChildren={getMaxIssuesPreference()}
          moreElement={(hidden) => (
            <MenuBarItem title={`... ${hidden} more assigned`} onAction={() => launchMyIssues()} />
          )}
        >
          {issues?.map((m) => (
            <MenuBarItem
              icon={{
                source: GitLabIcons.merge_request,
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
