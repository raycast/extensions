import { ActionPanel, Action, Detail, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { useState } from 'react';

import { OpenOnNetlify } from './components/actions';
import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { formatDate } from './utils/helpers';
import { useTeams } from './utils/hooks';
import { getIconForAuditLogPayload } from './utils/icons';

export default function Command() {
  const [query, setQuery] = useState<string>('');

  const { isLoadingTeams, teams, teamSlug, setTeamSlug } = useTeams({
    scoped: true,
  });

  const { data: auditLog = [], isLoading } = usePromise(
    async (team: string) => (team ? await api.getAuditLog(team) : []),
    [teamSlug],
  );

  const teamDropdown = (
    <TeamDropdown
      required
      teamSlug={teamSlug}
      setTeamSlug={setTeamSlug}
      teams={teams}
    />
  );

  const filteredAuditLog = auditLog.filter((log) => {
    const keywords = [
      log.payload.action || '',
      log.payload.actor_name || '',
      JSON.stringify(log.payload.traits || {}),
    ];
    return keywords.some((keyword) =>
      keyword.toLowerCase().includes(query.toLowerCase()),
    );
  });

  return (
    <List
      isLoading={isLoadingTeams || isLoading}
      onSearchTextChange={setQuery}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
      searchBarPlaceholder="Filter recent audit log entries"
      searchText={query}
    >
      {filteredAuditLog.length === 0 && (
        <List.EmptyView
          title="No audit log found"
          description="Your team's plan may not have audit log capabilities."
        />
      )}
      <List.Section title="Audit log">
        {filteredAuditLog
          .sort((a, b) =>
            new Date(a.payload.timestamp) < new Date(b.payload.timestamp)
              ? 1
              : -1,
          )
          .map((log) => (
            <List.Item
              key={log.id}
              icon={getIconForAuditLogPayload(log.payload)}
              title={log.payload.action}
              subtitle={log.payload.actor_name}
              accessories={[
                {
                  text: formatDate(log.payload.timestamp),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Audit Log"
                    target={
                      <AuditLogDetail
                        json={JSON.stringify(log.payload.traits, null, 2)}
                        payload={log.payload}
                        teamSlug={teamSlug}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

const AuditLogDetail = ({
  json,
  payload,
  teamSlug,
}: {
  json: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  teamSlug: string;
}) => {
  const markdown = `
\`\`\`json
${json}
\`\`\`
`;

  const url = `https://app.netlify.com/teams/${teamSlug}/log`;
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Action" text={payload.action} />
          {payload.actor_name && (
            <Detail.Metadata.Label title="Actor" text={payload.actor_name} />
          )}
          <Detail.Metadata.Label
            title="Date"
            text={formatDate(payload.timestamp)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="More details"
            target={url}
            text="Open Audit Log on Netlify"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <OpenOnNetlify url={url} />
        </ActionPanel>
      }
    />
  );
};
