import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { buildRecentDifficultyQuery, endpoint } from './api';
import { ProblemDetail } from './problem-search';
import { ratingTag, useProblemRatings } from './ratings';
import { ProblemDifficulty, RecentDifficultyResponse, RecentSubmission } from './types';

function formatDifficultyColor(difficulty: ProblemDifficulty): Color {
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

function formatSubmittedAt(timestamp: string): string {
  const date = new Date(Number(timestamp) * 1000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

export function RecentSubmissions(props: { username: string; submissions: RecentSubmission[] }) {
  const { username, submissions } = props;
  const { showProblemRatings } = getPreferenceValues<Preferences>();
  const { ratings, isRatingsLoading } = useProblemRatings(showProblemRatings);

  const slugs = useMemo(() => submissions.map((s) => s.titleSlug), [submissions]);

  const { isLoading, data: difficulties } = useFetch<
    RecentDifficultyResponse,
    undefined,
    Record<string, ProblemDifficulty>
  >(endpoint, {
    method: 'POST',
    body: JSON.stringify({ query: buildRecentDifficultyQuery(slugs) }),
    headers: { 'Content-Type': 'application/json' },
    mapResult(result: RecentDifficultyResponse) {
      const map: Record<string, ProblemDifficulty> = {};
      for (const question of Object.values(result.data)) {
        if (question) map[question.titleSlug] = question.difficulty;
      }
      return { data: map };
    },
    execute: slugs.length > 0,
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading || isRatingsLoading}
      navigationTitle={`${username} · Recent Accepted`}
      searchBarPlaceholder="Filter recent submissions"
    >
      <List.EmptyView title="No recent accepted submissions" />
      {submissions.map((submission) => {
        const difficulty = difficulties?.[submission.titleSlug];
        const ratingsLoaded = showProblemRatings && ratings != null;
        return (
          <List.Item
            key={submission.id}
            title={submission.title}
            accessories={[
              ...(difficulty ? [{ tag: { color: formatDifficultyColor(difficulty), value: difficulty } }] : []),
              ...(ratingsLoaded ? [{ tag: ratingTag(ratings[submission.titleSlug]), tooltip: 'Zerotrac rating' }] : []),
              { text: formatSubmittedAt(submission.timestamp) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Preview Problem"
                  icon={Icon.Eye}
                  target={<ProblemDetail titleSlug={submission.titleSlug} />}
                />
                <Action.OpenInBrowser
                  title="Open Problem in Browser"
                  url={`https://leetcode.com/problems/${submission.titleSlug}/`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
