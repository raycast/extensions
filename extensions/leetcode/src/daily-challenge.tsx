import {  Detail } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { dailyChallengeQuery, endpoint } from './api';
import { DailyChallenge, DailyChallengeResponse } from './types';
import { formatProblemMarkdown } from './utils';
import { useCodeSnippets } from './hooks/useCodeSnippets';
import { useProblemTemplateActions } from './hooks/useProblemTemplateActions';

export default function Command(): JSX.Element {
  const { isLoading: isDailyChallengeLoading, data: dailyChallenge } = useFetch<DailyChallengeResponse, undefined, DailyChallenge>(endpoint, {
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

  const { isLoading: isSnippetsLoading, data: codeSnippets } = useCodeSnippets(dailyChallenge?.problem.titleSlug);

  const problemMarkdown = useMemo(
    () => formatProblemMarkdown(dailyChallenge?.problem, dailyChallenge?.date),
    [dailyChallenge],
  );

  const actions = useProblemTemplateActions({
    codeSnippets,
    problemMarkdown,
    isPaidOnly: dailyChallenge?.problem.isPaidOnly,
    linkUrl: `https://leetcode.com${dailyChallenge?.link}`
  });

  return (
    <Detail
      isLoading={isDailyChallengeLoading || isSnippetsLoading}
      markdown={problemMarkdown}
      actions={actions}
    />
  );
}
