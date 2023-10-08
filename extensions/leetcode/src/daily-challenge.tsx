import { Action, ActionPanel, Detail } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useState } from 'react';
import { dailyChallengeQuery, endpoint } from './api';
import { DailyChallenge, DailyChallengeResponse } from './types';
import { formatProblemMarkdown } from './utils';

export default function Command(): JSX.Element {
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | undefined>(undefined);

  const { isLoading } = useFetch<DailyChallengeResponse>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: dailyChallengeQuery,
      variables: {},
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    onData: (data) => {
      setDailyChallenge(data.data.dailyChallenge);
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={formatProblemMarkdown(dailyChallenge?.problem, dailyChallenge?.date)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`https://leetcode.com${dailyChallenge?.link}`} />
          <Action.CopyToClipboard
            title="Copy Link to Clipboard"
            content={`https://leetcode.com${dailyChallenge?.link}`}
          />
        </ActionPanel>
      }
    ></Detail>
  );
}
