import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { listMembers } from "./api/endpoints";
import type { WorkspaceMember } from "./api/types";
import ExportActions from "./components/ExportActions";
import { guard } from "./components/Guard";
import { useAttio } from "./hooks/useAttio";

export default function MembersAndTeams() {
  const h = useAttio("listMembers", async () => (await listMembers()).data, []);
  const { isLoading, data, error } = h;
  const members: WorkspaceMember[] = data ?? [];

  const g = guard(h.guardInput(members.length > 0));
  if (g) return g;

  // CURRENTLY LOADED rows only (the loaded `members` list), not a re-fetch.
  const exportAction = (
    <ExportActions
      filenameBase="members"
      columns={["Name", "Email", "Access"]}
      rows={members.map((m) => [`${m.first_name} ${m.last_name}`.trim(), m.email_address, m.access_level])}
    />
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !members.length && !error ? (
        <List.EmptyView icon={Icon.TwoPeople} title="No members yet" />
      ) : (
        members.map((member) => (
          <List.Item
            key={member.id.workspace_member_id}
            icon={member.avatar_url ? { source: member.avatar_url, mask: Image.Mask.RoundedRectangle } : Icon.Person}
            title={`${member.first_name} ${member.last_name}`}
            subtitle={member.email_address}
            accessories={[{ tag: member.access_level }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Email" content={member.email_address} />
                  <Action.OpenInBrowser title="Send Email" url={`mailto:${member.email_address}`} />
                </ActionPanel.Section>
                <ActionPanel.Section>{exportAction}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
