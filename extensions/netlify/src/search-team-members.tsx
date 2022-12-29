import { ActionPanel, Action, Image, List } from '@raycast/api';
import { getAvatarIcon, useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';

import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { Member, Team } from './utils/interfaces';
import { handleNetworkError } from './utils/utils';

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useCachedState<string>(
    'selectedTeam',
    '',
  );

  const teamDropdown = (
    <TeamDropdown
      selectedTeam={selectedTeam}
      setSelectedTeam={setSelectedTeam}
      teams={teams}
    />
  );

  async function fetchTeams() {
    try {
      const teams = await api.getTeams();
      setTeams(teams);
    } catch (e) {
      handleNetworkError(e);
    }
  }

  async function fetchMembers(team: string) {
    setLoading(true);
    try {
      const members = await api.getMembers(team);
      setMembers(members);
      setLoading(false);
    } catch (e) {
      handleNetworkError(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchMembers(selectedTeam);
  }, [selectedTeam]);

  function getMemberName(member: Member) {
    return member.full_name || member.email || '';
  }

  function sortAlphabetically(a: Member, b: Member) {
    return getMemberName(a).toLowerCase() > getMemberName(b).toLowerCase()
      ? 1
      : -1;
  }

  return (
    <List isLoading={isLoading} searchBarAccessory={teamDropdown}>
      <List.Section title={`${members.length} team members`}>
        {members.sort(sortAlphabetically).map((member) => {
          const name = member.full_name || member.email;
          return (
            <List.Item
              key={member.id}
              icon={{
                source:
                  member.avatar && !member.avatar.includes('.gravatar.')
                    ? member.avatar
                    : getAvatarIcon(name),
                mask: Image.Mask.Circle,
              }}
              title={name}
              subtitle={member.email}
              // @ts-expect-error idk how to fix
              accessories={[
                member.connected_accounts.github && {
                  tooltip: member.connected_accounts.github,
                  icon: 'vcs/github.svg',
                },
                member.connected_accounts.gitlab && {
                  tooltip: member.connected_accounts.gitlab,
                  icon: 'vcs/gitlab.svg',
                },
                member.connected_accounts.bitbucket && {
                  tooltip: member.connected_accounts.bitbucket,
                  icon: 'vcs/bitbucket.svg',
                },
                member.pending
                  ? {
                      tag: 'Pending',
                      tooltip: `Invitation sent`,
                    }
                  : {
                      tag: member.role,
                      tooltip: `Can access ${member.site_access} sites`,
                    },
              ].filter(Boolean)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Manage Membership"
                      url={`https://app.netlify.com/teams/${selectedTeam}/members`}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {member.connected_accounts.github && (
                      <Action.OpenInBrowser
                        icon="vcs/github.svg"
                        title="Open GitHub Profile"
                        url={`https://github.com/${member.connected_accounts.github}`}
                      />
                    )}
                    {member.connected_accounts.gitlab && (
                      <Action.OpenInBrowser
                        icon="vcs/gitlab.svg"
                        title="Open GitLab Profile"
                        url={`https://gitlab.com/${member.connected_accounts.gitlab}`}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
