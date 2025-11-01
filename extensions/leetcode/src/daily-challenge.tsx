import { Detail } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { dailyChallengeQuery, endpoint } from './api';
import { DailyChallenge, DailyChallengeResponse } from './types';
import { formatProblemMarkdown } from './utils';
import { useProblemTemplateActions } from './useProblemTemplateActions';

export default function Command(): JSX.Element {
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
    mapResult(result) {
      return {
        data: result.data.dailyChallenge,
      };
    },
  });

  const problemMarkdown = useMemo(
    () => formatProblemMarkdown(dailyChallenge?.problem, dailyChallenge?.date),
    [dailyChallenge],
  );

  const actions = useProblemTemplateActions({
    codeSnippets: dailyChallenge?.problem.codeSnippets,
    problemMarkdown,
    isPaidOnly: dailyChallenge?.problem.isPaidOnly,
    linkUrl: `https://leetcode.com${dailyChallenge?.link}`,
  });

  return <Detail isLoading={isDailyChallengeLoading} markdown={problemMarkdown} actions={actions} />;
}
