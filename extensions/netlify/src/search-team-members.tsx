import { ActionPanel, Action, Image, List } from '@raycast/api';
import { getAvatarIcon, usePromise } from '@raycast/utils';

import { OpenGitProfile } from './components/actions';
import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { formatDate, humanRole } from './utils/helpers';
import { useTeams } from './utils/hooks';
import { getGitProviderIcon } from './utils/icons';
import { Committer, GitProvider, Member, Reviewer } from './utils/interfaces';
import InviteTeamMembers from './invite-team-members';

export default function Command() {
  const { isLoadingTeams, teams, teamSlug, setTeamSlug } = useTeams({
    scoped: true,
  });

  const { data, isLoading } = usePromise(
    async (slug: string) => {
      if (slug) {
        return await Promise.all([
          api.getMembers(slug),
          api.getCommitters(slug),
          api.getReviewers(slug),
        ]);
      } else {
        return [];
      }
    },
    [teamSlug],
  );

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

  const teamDropdown = (
    <TeamDropdown
      required
      teamSlug={teamSlug}
      setTeamSlug={setTeamSlug}
      teams={teams}
    />
  );

  const members = (data?.[0] || []) as Member[];
  const committers = (data?.[1] || []) as Committer[];
  const reviewers = (data?.[2] || []) as Reviewer[];
  return (
    <List
      isLoading={isLoadingTeams || isLoading}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
      searchBarPlaceholder="Search for team members..."
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
              keywords={[member.email, humanRole(member.role)]}
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
                      tag: humanRole(member.role),
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
        icon={{
          source: { light: 'netlify-icon.svg', dark: 'netlify-icon@dark.svg' },
        }}
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
