import { Action, ActionPanel, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import type { Team, TeamMember } from "../types/Types";
import { exportTeamMembers } from "../utils/export";
import { showContextualError } from "../utils/errorHandling";

/**
 * Displays an action panel with various actions related to the given team.
 *
 * @param {Object} props - The properties to pass to the component.
 * @param {Team} props.team - The team to display actions for.
 * @param {TeamMember[]} [props.members] - The team members to display actions for.
 * @param {Function} [props.onShowMembers] - A function to call when the user wants to view the team members.
 * @param {Function} [props.onRefresh] - A function to call when the user wants to refresh the team information.
 */
export function TeamActions(props: {
  team: Team;
  members?: TeamMember[];
  onShowMembers?: () => void;
  onRefresh?: () => void;
}) {
  const { team, members, onShowMembers, onRefresh } = props;

  const exportTeamMembersAsCSV = async () => {
    await exportTeamMembers({
      members: members || [],
      teamName: team.name,
      format: "csv",
    });
  };

  const exportTeamMembersAsVCards = async () => {
    await exportTeamMembers({
      members: members || [],
      teamName: team.name,
      format: "vcf",
    });
  };

  /**
   * Opens the search-meetings command with the team name as a launch context.
   *
   * @async
   * @returns {Promise<void>} A promise that resolves when the command is launched.
   */
  const viewTeamMeetings = async (): Promise<void> => {
    try {
      await launchCommand(
        { name: "search-meetings", type: LaunchType.UserInitiated },
        // @ts-expect-error launchContext is not defined in LaunchType.UserInitiated
        {
          launchContext: {
            team: team.name,
          },
        },
      );
    } catch (error) {
      await showContextualError(error, {
        action: "open meetings",
        fallbackTitle: "Failed to Open Meetings",
      });
    }
  };

  /**
   * Copies the team members to the clipboard.
   *
   * @returns {string} The team members as a string.
   */
  const copyTeamMembers = () => {
    if (!members || members.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No members to copy" });
      return;
    }

    const membersList = members.map((m) => `${m.name} <${m.email}>`).join("\n");
    return membersList;
  };

  return (
    <ActionPanel>
      {onShowMembers && (
        <Action
          title="View Team Members"
          onAction={onShowMembers}
          icon={Icon.PersonCircle}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      )}
      <Action.CopyToClipboard title="Copy Team Name" content={team.name} icon={Icon.Clipboard} />
      {members && members.length > 0 && (
        <Action.CopyToClipboard
          title="Copy Team Members"
          content={copyTeamMembers() || ""}
          icon={Icon.PersonLines}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      )}
      {members && members.length > 0 && (
        <>
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Export Team as vCard"
            onAction={exportTeamMembersAsVCards}
            icon={Icon.AddPerson}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action title="Export Team as CSV" onAction={exportTeamMembersAsCSV} icon={Icon.Download} />
        </>
      )}
      <Action
        title="View Team's Meetings"
        onAction={viewTeamMeetings}
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      <Action.CopyToClipboard
        title="Copy All Details"
        content={JSON.stringify(team, null, 2)}
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      {onRefresh && (
        <Action
          title="Refresh"
          onAction={onRefresh}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      )}
    </ActionPanel>
  );
}
