import { Detail, getPreferenceValues } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { dailyChallengeQuery, endpoint } from './api';
import { DailyChallenge, DailyChallengeResponse } from './types';
import { formatProblemMarkdown } from './utils';
import { useProblemTemplateActions } from './useProblemTemplateActions';
import { useProblemRatings } from './ratings';

export default function Command() {
  const { isLoading: isDailyChallengeLoading, data: dailyChallenge } = useFetch<
    DailyChallengeResponse,
    undefined,
    DailyChallenge
  >(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: dailyChallengeQuery,
      variables: {},
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    mapResult(result: DailyChallengeResponse) {
      return {
        data: result.data.dailyChallenge,
      };
    },
  });

  const { showProblemRatings } = getPreferenceValues<Preferences>();
  const { ratings, isRatingsLoading } = useProblemRatings(showProblemRatings);
  const ratingsLoaded = showProblemRatings && ratings != null;
  const rating = ratingsLoaded ? ratings[dailyChallenge?.problem.titleSlug ?? ''] : undefined;

  const problemMarkdown = useMemo(
    () => formatProblemMarkdown(dailyChallenge?.problem, dailyChallenge?.date, rating, ratingsLoaded),
    [dailyChallenge, rating, ratingsLoaded],
  );

  const actions = useProblemTemplateActions({
    codeSnippets: dailyChallenge?.problem.codeSnippets,
    problemMarkdown,
    isPaidOnly: dailyChallenge?.problem.isPaidOnly,
    linkUrl: `https://leetcode.com${dailyChallenge?.link}`,
  });

  return (
    <Detail isLoading={isDailyChallengeLoading || isRatingsLoading} markdown={problemMarkdown} actions={actions} />
  );
}
