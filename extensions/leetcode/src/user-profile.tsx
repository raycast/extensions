import { Action, ActionPanel, Color, Detail, Icon, LaunchProps } from '@raycast/api';
import { getPreferenceValues } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { endpoint, userProfileQuery } from './api';
import { SubmissionCount, UserProfileData, UserProfileResponse } from './types';
import { RecentSubmissions } from './recent-submissions';

const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Hard'] as const;

function difficultyColor(difficulty: string): Color {
  switch (difficulty) {
    case 'Easy':
      return Color.Green;
    case 'Medium':
      return Color.Orange;
    case 'Hard':
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}

function byDifficulty(list: SubmissionCount[] | undefined): Record<string, SubmissionCount> {
  return Object.fromEntries((list ?? []).map((s) => [s.difficulty, s]));
}

export default function Command(props: LaunchProps<{ arguments: Arguments.UserProfile }>) {
  const { username: defaultUsername } = getPreferenceValues<Preferences.UserProfile>();
  const username = (props.arguments.username || defaultUsername || '').trim();
  const year = new Date().getFullYear();

  const { isLoading, data } = useFetch<UserProfileResponse, undefined, UserProfileData>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: userProfileQuery,
      variables: { username, year },
    }),
    headers: {
      'Content-Type': 'application/json',
      // matchedUser / calendar queries are rejected by LeetCode's edge without these.
      Referer: `https://leetcode.com/${username}/`,
      'User-Agent': 'Mozilla/5.0 (Raycast LeetCode Extension)',
    },
    mapResult(result: UserProfileResponse) {
      return { data: result.data };
    },
    execute: username !== '',
    keepPreviousData: false,
  });

  const user = data?.matchedUser ?? null;
  const contest = data?.userContestRanking ?? null;
  const recent = data?.recentAcSubmissionList ?? [];

  const ac = useMemo(() => byDifficulty(user?.submitStats.acSubmissionNum), [user]);

  // ---- empty / error states ----
  if (username === '') {
    return (
      <Detail
        markdown={
          '# No username provided\n\nPass a username as an argument, or set a default in this command’s preferences (⌘ ,).'
        }
      />
    );
  }

  if (!isLoading && data && !user) {
    return <Detail markdown={`# User not found\n\nNo LeetCode user named \`${username}\`.`} />;
  }

  // ---- main body ----
  const markdown = user
    ? [
        user.profile.userAvatar ? `<img src="${user.profile.userAvatar}" width="80" height="80" />` : '',
        `# ${user.profile.realName || user.username}`,
        `@${user.username}${user.profile.countryName ? ` · ${user.profile.countryName}` : ''}`,
        user.profile.aboutMe ? `\n> ${user.profile.aboutMe}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={user ? `${user.username} · LeetCode` : 'LeetCode Profile'}
      metadata={
        user ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Global Ranking" text={user.profile.ranking?.toLocaleString() ?? 'N/A'} />
            <Detail.Metadata.Label title="Reputation" text={String(user.profile.reputation ?? 0)} />
            <Detail.Metadata.TagList title="Solved">
              {DIFFICULTY_ORDER.map((d) => (
                <Detail.Metadata.TagList.Item key={d} text={`${d}: ${ac[d]?.count ?? 0}`} color={difficultyColor(d)} />
              ))}
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />

            {contest ? (
              <>
                <Detail.Metadata.Label title="Contest Rating" text={Math.round(contest.rating).toString()} />
                <Detail.Metadata.Label
                  title="Global Contest Rank"
                  text={contest.globalRanking?.toLocaleString() ?? 'N/A'}
                />
                <Detail.Metadata.Label
                  title="Top %"
                  text={contest.topPercentage != null ? `${contest.topPercentage.toFixed(1)}%` : 'N/A'}
                />
                <Detail.Metadata.Label title="Contests Attended" text={String(contest.attendedContestsCount)} />
              </>
            ) : (
              <Detail.Metadata.Label title="Contest Rating" text="No contests" />
            )}

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Current Streak" text={`${user.userCalendar?.streak ?? 0} days`} />
            <Detail.Metadata.Label
              title="Active Days (this year)"
              text={String(user.userCalendar?.totalActiveDays ?? 0)}
            />

            {user.badges.length ? (
              <Detail.Metadata.TagList title="Badges">
                {user.badges.slice(0, 6).map((b) => (
                  <Detail.Metadata.TagList.Item key={b.id} text={b.displayName} />
                ))}
              </Detail.Metadata.TagList>
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {recent.length ? (
            <Action.Push
              title="View Recent Submissions"
              icon={Icon.List}
              target={<RecentSubmissions username={username} submissions={recent} />}
            />
          ) : null}
          <Action.OpenInBrowser title="Open Profile" url={`https://leetcode.com/${username}/`} />
          <Action.CopyToClipboard title="Copy Username" content={username} />
        </ActionPanel>
      }
    />
  );
}
