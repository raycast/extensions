import { Action, ActionPanel, Icon, showToast, Toast, environment } from "@raycast/api";
import type { TeamMember } from "../types/Types";
import { exportAsVCard, exportTeamMembers } from "../utils/export";
import MemberMeetingsView from "../views/MemberMeetingsView";
import { showContextualError } from "../utils/errorHandling";
import path from "path";
import fs from "fs";

export function TeamMemberActions(props: {
  member: TeamMember;
  onRefresh?: () => void;
  allMembers?: TeamMember[];
  teamName?: string;
}) {
  const { member, onRefresh, allMembers, teamName } = props;
  const email = member.email;

  const exportMemberDetails = async () => {
    try {
      const jsonContent = JSON.stringify(member, null, 2);

      const downloadsPath = path.join(environment.supportPath, "downloads");
      const filename = `${member.name.replace(/[^\w-]+/g, "_")}_details_${new Date().toISOString().slice(0, 10)}.json`;
      const filePath = path.join(downloadsPath, filename);

      // Write JSON file directly
      fs.mkdirSync(downloadsPath, { recursive: true });
      fs.writeFileSync(filePath, jsonContent, "utf8");

      await showToast({
        style: Toast.Style.Success,
        title: "Exported Member Details",
        message: `Saved ${filename}`,
      });
    } catch (error) {
      await showContextualError(error, {
        action: "export member details",
        fallbackTitle: "Export Failed",
      });
    }
  };

  const exportMemberAsVCard = async () => {
    try {
      const note = member.createdAt
        ? `Fathom member since ${new Date(member.createdAt).toLocaleDateString()}`
        : undefined;

      const filePath = await exportAsVCard({
        name: member.name,
        email: member.email,
        organization: member.team || undefined,
        note,
      });

      const filename = path.basename(filePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported to Contacts",
        message: `Saved ${filename}`,
      });
    } catch (error) {
      await showContextualError(error, {
        action: "export member details",
        fallbackTitle: "Export Failed",
      });
    }
  };

  return (
    <ActionPanel>
      {/* Default Actions */}
      {email && (
        <>
          <Action.Push
            title="View Member's Meetings"
            icon={Icon.MagnifyingGlass}
            target={<MemberMeetingsView email={email} name={member.name} />}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <Action.OpenInBrowser url={`mailto:${email}`} title="Send Email" icon={Icon.Envelope} />
        </>
      )}

      {/* Copy Section */}
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Name"
          content={member.name}
          icon={Icon.Person}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {email && (
          <Action.CopyToClipboard
            title="Copy Email Address"
            content={email}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
        <Action.CopyToClipboard
          title="Copy All Details"
          content={JSON.stringify(member, null, 2)}
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>

      {/* Export Section */}
      <ActionPanel.Section title="Export">
        <Action
          title="Export Member as Vcard"
          onAction={exportMemberAsVCard}
          icon={Icon.AddPerson}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
        <Action title="Export Member as JSON" onAction={exportMemberDetails} icon={Icon.Download} />
        {allMembers && allMembers.length > 0 && (
          <>
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title={`Export All ${teamName ? `${teamName} ` : ""}Members as vCard`}
              onAction={async () => {
                await exportTeamMembers({
                  members: allMembers,
                  teamName: teamName || "Team",
                  format: "vcf",
                });
              }}
              icon={Icon.PersonLines}
              shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
            />
            <Action
              title={`Export All ${teamName ? `${teamName} ` : ""}Members as CSV`}
              onAction={async () => {
                await exportTeamMembers({
                  members: allMembers,
                  teamName: teamName || "Team",
                  format: "csv",
                });
              }}
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </>
        )}
      </ActionPanel.Section>

      {/* Other Actions */}
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
