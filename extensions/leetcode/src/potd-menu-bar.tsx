import { getPreferenceValues, Icon, MenuBarExtra, open, openExtensionPreferences } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { dailyChallengeLiteQuery, endpoint, potdStatusQuery } from './api';
import { PotdProblem, PotdStatusResponse } from './types';

// LeetCode's recentAcSubmissionList caps at 20, so if today's daily is followed
// by 20+ other accepted problems before the reset it can scroll out of view and
// read as unsolved. Accepted tradeoff given the API limit.
const RECENT_LIMIT = 20;

// The LeetCode daily challenge resets at 00:00 UTC.
function msUntilReset(): number {
  const now = new Date();
  const nextResetUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return nextResetUtc - now.getTime();
}

// Unix seconds for the start of the current UTC day (this cycle's reset point).
function startOfUtcDaySeconds(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) / 1000;
}

function formatTimeLeft(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

type Status = { problem?: PotdProblem; solved: boolean };

export default function Command() {
  const { username } = getPreferenceValues<Preferences.PotdMenuBar>();
  const trimmedUsername = username?.trim() ?? '';
  const hasUsername = trimmedUsername !== '';

  const { isLoading, data } = useFetch<PotdStatusResponse, undefined, Status>(endpoint, {
    method: 'POST',
    body: JSON.stringify(
      hasUsername
        ? { query: potdStatusQuery, variables: { username: trimmedUsername, limit: RECENT_LIMIT } }
        : { query: dailyChallengeLiteQuery },
    ),
    headers: {
      'Content-Type': 'application/json',
      // recentAcSubmissionList is rejected by LeetCode's edge without these.
      Referer: 'https://leetcode.com/',
      'User-Agent': 'Mozilla/5.0 (Raycast LeetCode Extension)',
    },
    mapResult(result: PotdStatusResponse) {
      const problem = result.data.dailyChallenge?.problem;
      const recent = result.data.recentAcSubmissionList ?? [];
      const resetSeconds = startOfUtcDaySeconds();
      const solved = problem
        ? recent.some((s) => s.titleSlug === problem.titleSlug && Number(s.timestamp) >= resetSeconds)
        : false;
      return { data: { problem, solved } };
    },
  });

  const problem = data?.problem;
  const solved = data?.solved ?? false;
  const timeLeft = formatTimeLeft(msUntilReset());
  const problemUrl = problem
    ? `https://leetcode.com/problems/${problem.titleSlug}/`
    : 'https://leetcode.com/problemset/';

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: solved ? 'flame.svg' : 'flame-outline.svg' }}
      title={solved ? undefined : timeLeft}
      tooltip={solved ? 'LeetCode Daily Challenge · Solved' : `LeetCode Daily Challenge · ${timeLeft} left`}
    >
      {problem ? (
        <MenuBarExtra.Item
          title={`${problem.questionFrontendId}. ${problem.title}`}
          subtitle={problem.difficulty}
          onAction={() => open(problemUrl)}
        />
      ) : (
        <MenuBarExtra.Item title="Could not load today's problem" />
      )}

      <MenuBarExtra.Section>
        {hasUsername ? (
          <MenuBarExtra.Item
            title={solved ? 'Solved today' : 'Not solved yet'}
            icon={solved ? Icon.Check : Icon.Clock}
          />
        ) : (
          <MenuBarExtra.Item
            title="Set your username to track status"
            icon={Icon.Person}
            onAction={openExtensionPreferences}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Problem in Browser" icon={Icon.Globe} onAction={() => open(problemUrl)} />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
