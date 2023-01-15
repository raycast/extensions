import { ActionPanel, Action, Image, List } from '@raycast/api';
import { getAvatarIcon, useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';

import { OpenGitProfile } from './components/actions';
import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { formatDate, handleNetworkError } from './utils/helpers';
import { getGitProviderIcon } from './utils/icons';
import {
  Committer,
  GitProvider,
  Member,
  Reviewer,
  Team,
} from './utils/interfaces';
import InviteTeamMembers from './invite-team-members';

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [committers, setCommitters] = useState<Committer[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);

  const [teamSlug, setTeamSlug] = useCachedState<string>('teamSlug', '');

  const teamDropdown = (
    <TeamDropdown
      required
      teamSlug={teamSlug}
      setTeamSlug={setTeamSlug}
      teams={teams}
    />
  );

  async function fetchTeams() {
    setLoading(true);
    try {
      const teams = await api.getTeams();
      setTeams(teams);
      if (teams.length === 1 || !teamSlug) {
        const user = await api.getUser();
        setTeamSlug(user.preferred_account_id);
      }
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
    async function reload() {
      setLoading(true);
      const promises = [
        api.getMembers(teamSlug),
        api.getCommitters(teamSlug),
        api.getReviewers(teamSlug),
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
    if (teamSlug) {
      reload();
    }
  }, [teamSlug]);

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
    <List
      isLoading={isLoading}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
    >
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
              accessories={[
                ...Object.entries(member.connected_accounts).map(
                  ([provider, username]) => ({
                    icon: getGitProviderIcon(provider as GitProvider),
                    tooltip: username,
                  }),
                ),
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
                  teamSlug={teamSlug}
                  page="members"
                  providers={member.connected_accounts}
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
              icon={getGitProviderIcon(committer.provider)}
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
                  teamSlug={teamSlug}
                  page="contributors"
                  providers={{ [committer.provider]: committer.provider_slug }}
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
                      tooltip: `Approved as a Reviewer`,
                    },
              ]}
              actions={<MemberActions teamSlug={teamSlug} page="reviewers" />}
            />
          );
        })}
      </List.Section>
      <List.EmptyView
        title="No matching team members found"
        description="Press the return key to invite new team members."
        actions={
          <ActionPanel>
            <Action.Push
              title="Invite Team Members"
              target={<InviteTeamMembers />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

const MemberActions = ({
  page,
  providers,
  teamSlug,
}: {
  page: 'members' | 'contributors' | 'reviewers';
  providers?: Record<string, string>;
  teamSlug: string;
}) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.OpenInBrowser
        icon="icon.png"
        title="Manage Membership"
        url={`https://app.netlify.com/teams/${teamSlug}/${page}`}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      {Object.entries(providers || {}).map(([provider, username]) => (
        <OpenGitProfile
          key={provider}
          provider={provider as GitProvider}
          username={username}
        />
      ))}
    </ActionPanel.Section>
  </ActionPanel>
);
