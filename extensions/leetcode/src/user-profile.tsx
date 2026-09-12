import { Action, ActionPanel, Color, Detail, Icon, LaunchProps } from '@raycast/api';
import { getPreferenceValues } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { endpoint, userProfileQuery } from './api';
import { SubmissionCount, UserProfileData, UserProfileResponse } from './types';
import { RecentSubmissions } from './recent-submissions';

function byDifficulty(list: SubmissionCount[] | undefined): Record<string, SubmissionCount> {
  return Object.fromEntries((list ?? []).map((s) => [s.difficulty, s]));
}

// e.g. https://github.com/foo -> "@foo"
function handleFromUrl(url: string): string {
  const segment = url.replace(/\/+$/, '').split('/').filter(Boolean).pop();
  return segment ? `@${segment}` : 'Open';
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
  const totalSubs = useMemo(() => byDifficulty(user?.submitStats.totalSubmissionNum), [user]);

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
  const solved = {
    easy: ac['Easy']?.count ?? 0,
    medium: ac['Medium']?.count ?? 0,
    hard: ac['Hard']?.count ?? 0,
    total: ac['All']?.count ?? 0,
  };
  const acRate = totalSubs['All']?.submissions
    ? `${(((ac['All']?.submissions ?? 0) / totalSubs['All'].submissions) * 100).toFixed(1)}%`
    : 'N/A';

  // Table rows must stay on consecutive lines; every other block is separated by
  // a blank line so raw HTML (the avatar) doesn't swallow the markdown after it.
  const solvedTable = [
    `| 🟢 Easy | 🟠 Medium | 🔴 Hard | Σ Total |`,
    `| :-----: | :-------: | :-----: | :-----: |`,
    `| ${solved.easy} | ${solved.medium} | ${solved.hard} | **${solved.total}** |`,
  ].join('\n');

  const markdown = user
    ? [
        user.profile.userAvatar
          ? `<img src="${user.profile.userAvatar}" alt="${user.username}" width="96" height="96" />`
          : '',
        `# ${user.profile.realName || user.username}`,
        `\`@${user.username}\`${user.profile.countryName ? ` · ${user.profile.countryName}` : ''}`,
        user.profile.aboutMe ? `> ${user.profile.aboutMe}` : '',
        `## Problems Solved`,
        solvedTable,
        `**Acceptance Rate:** ${acRate}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    : '';

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={user ? `${user.username} · LeetCode` : 'LeetCode Profile'}
      metadata={
        user ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Global Ranking"
              icon={Icon.Trophy}
              text={user.profile.ranking ? `#${user.profile.ranking.toLocaleString()}` : 'N/A'}
            />
            <Detail.Metadata.Label title="Reputation" icon={Icon.Star} text={String(user.profile.reputation ?? 0)} />
            {user.profile.company ? (
              <Detail.Metadata.Label title="Company" icon={Icon.Building} text={user.profile.company} />
            ) : null}
            {user.profile.school ? (
              <Detail.Metadata.Label title="School" icon={Icon.Book} text={user.profile.school} />
            ) : null}

            <Detail.Metadata.Separator />

            {contest ? (
              <>
                <Detail.Metadata.Label
                  title="Contest Rating"
                  icon={Icon.LineChart}
                  text={Math.round(contest.rating).toString()}
                />
                {contest.badge?.name ? (
                  <Detail.Metadata.TagList title="Contest Badge">
                    <Detail.Metadata.TagList.Item text={contest.badge.name} color={Color.Yellow} />
                  </Detail.Metadata.TagList>
                ) : null}
                <Detail.Metadata.Label
                  title="Global Contest Rank"
                  text={contest.globalRanking ? `#${contest.globalRanking.toLocaleString()}` : 'N/A'}
                />
                <Detail.Metadata.Label
                  title="Top %"
                  text={contest.topPercentage != null ? `${contest.topPercentage.toFixed(1)}%` : 'N/A'}
                />
                <Detail.Metadata.Label title="Contests Attended" text={String(contest.attendedContestsCount)} />
              </>
            ) : (
              <Detail.Metadata.Label title="Contest Rating" icon={Icon.LineChart} text="No contests" />
            )}

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label
              title="Current Streak"
              icon={Icon.Bolt}
              text={`${user.userCalendar?.streak ?? 0} days`}
            />
            <Detail.Metadata.Label
              title="Active Days (this year)"
              icon={Icon.Calendar}
              text={String(user.userCalendar?.totalActiveDays ?? 0)}
            />

            {user.githubUrl || user.twitterUrl || user.linkedinUrl ? (
              <>
                <Detail.Metadata.Separator />
                {user.githubUrl ? (
                  <Detail.Metadata.Link title="GitHub" target={user.githubUrl} text={handleFromUrl(user.githubUrl)} />
                ) : null}
                {user.twitterUrl ? (
                  <Detail.Metadata.Link
                    title="Twitter"
                    target={user.twitterUrl}
                    text={handleFromUrl(user.twitterUrl)}
                  />
                ) : null}
                {user.linkedinUrl ? (
                  <Detail.Metadata.Link
                    title="LinkedIn"
                    target={user.linkedinUrl}
                    text={handleFromUrl(user.linkedinUrl)}
                  />
                ) : null}
              </>
            ) : null}

            {user.badges.length ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Badges">
                  {user.badges.slice(0, 6).map((b) => (
                    <Detail.Metadata.TagList.Item key={b.id} text={b.displayName} color={Color.Purple} />
                  ))}
                </Detail.Metadata.TagList>
              </>
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
