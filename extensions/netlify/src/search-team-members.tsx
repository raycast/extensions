import { ActionPanel, Action, Image, List } from '@raycast/api';
import { getAvatarIcon, useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';

import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { Committer, Member, Reviewer, Team } from './utils/interfaces';
import { formatDate, handleNetworkError } from './utils/utils';

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [committers, setCommitters] = useState<Committer[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);

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

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    async function reload() {
      setLoading(true);
      const promises = [
        api.getMembers(selectedTeam),
        api.getCommitters(selectedTeam),
        api.getReviewers(selectedTeam),
      ];
      try {
        const responses = await Promise.all(promises);
        const [mems, coms, revs] = responses;
        setMembers(mems as Member[]);
        setCommitters(coms as Committer[]);
        setReviewers(revs as Reviewer[]);
        setLoading(false);
      } catch (e) {
        handleNetworkError(e);
        setLoading(false);
      }
    }
    reload();
  }, [selectedTeam]);

  function getName(user: Member | Reviewer) {
    return user.full_name || user.email || '';
  }

  function sortAlphabetically(a: Member | Reviewer, b: Member | Reviewer) {
    return getName(a).toLowerCase() > getName(b).toLowerCase() ? 1 : -1;
  }

  function filterCommitters(committer: Committer) {
    const ONE_MONTH_AGO = 30 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const lastSeen = new Date(committer.last_seen).getTime();
    return !committer.member_id && now - lastSeen <= ONE_MONTH_AGO;
  }

  return (
    <List isLoading={isLoading} searchBarAccessory={teamDropdown}>
      <List.Section title={`Team members`}>
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
                // member.connected_accounts.bitbucket && {
                //   tooltip: member.connected_accounts.bitbucket,
                //   icon: 'vcs/bitbucket.svg',
                // },
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
                <MemberActions
                  github={member.connected_accounts.github}
                  gitlab={member.connected_accounts.gitlab}
                  selectedTeam={selectedTeam}
                  page="members"
                />
              }
            />
          );
        })}
      </List.Section>
      <List.Section title={`Git contributors`}>
        {committers.filter(filterCommitters).map((committer) => {
          return (
            <List.Item
              key={committer.id}
              icon={`vcs/${committer.provider}.svg`}
              title={committer.provider_slug}
              // subtitle={member.email}
              accessories={[
                {
                  text: formatDate(committer.last_seen),
                  tooltip: 'Last active',
                },
              ]}
              actions={
                <MemberActions
                  github={
                    committer.provider === 'github' && committer.provider_slug
                  }
                  gitlab={
                    committer.provider === 'gitlab' && committer.provider_slug
                  }
                  selectedTeam={selectedTeam}
                  page="members"
                />
              }
            />
          );
        })}
      </List.Section>
      <List.Section title={`Reviewers`}>
        {reviewers.sort(sortAlphabetically).map((reviewer) => {
          const name = reviewer.full_name || reviewer.email;
          return (
            <List.Item
              key={reviewer.id}
              icon={{
                source: getAvatarIcon(name),
                mask: Image.Mask.Circle,
              }}
              title={name}
              subtitle={reviewer.email}
              accessories={[
                reviewer.state === 'pending'
                  ? {
                      tag: 'Pending',
                      tooltip: `Invitation sent`,
                    }
                  : {
                      tag: 'Approved',
                      tooltip: `Can collaborate on Deploy Previews`,
                    },
              ]}
              actions={
                <MemberActions selectedTeam={selectedTeam} page="reviewers" />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

const MemberActions = ({
  github,
  gitlab,
  page,
  selectedTeam,
}: {
  github?: string | false;
  gitlab?: string | false;
  page: 'members' | 'reviewers';
  selectedTeam: string;
}) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.OpenInBrowser
        title="Manage Membership"
        url={`https://app.netlify.com/teams/${selectedTeam}/${page}`}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      {github && (
        <Action.OpenInBrowser
          icon="vcs/github.svg"
          title="Open GitHub Profile"
          url={`https://github.com/${github}`}
        />
      )}
      {gitlab && (
        <Action.OpenInBrowser
          icon="vcs/gitlab.svg"
          title="Open GitLab Profile"
          url={`https://gitlab.com/${gitlab}`}
        />
      )}
    </ActionPanel.Section>
  </ActionPanel>
);
