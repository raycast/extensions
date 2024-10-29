import { Action, ActionPanel, Detail } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo } from 'react';
import { dailyChallengeQuery, endpoint } from './api';
import { DailyChallenge, DailyChallengeResponse } from './types';
import { formatProblemMarkdown } from './utils';

export default function Command(): JSX.Element {
  const { isLoading, data: dailyChallenge } = useFetch<DailyChallengeResponse, undefined, DailyChallenge>(endpoint, {
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

  return (
    <Detail
      isLoading={isLoading}
      markdown={problemMarkdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`https://leetcode.com${dailyChallenge?.link}`} />
          <Action.CopyToClipboard
            title="Copy Link to Clipboard"
            content={`https://leetcode.com${dailyChallenge?.link}`}
          />
          <Action.CopyToClipboard
            title="Copy Problem to Clipboard"
            content={problemMarkdown}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
        </ActionPanel>
      }
    ></Detail>
  );
}
