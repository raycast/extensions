import { Action, ActionPanel } from '@raycast/api';

import type { RambdaFunction } from '../@types';

type CommonActionPanelProps = {
  data: RambdaFunction;
};

export const CommonActionPanel = ({ data, children }: React.PropsWithChildren<CommonActionPanelProps>) => (
  <ActionPanel>
    {children}
    <Action.CopyToClipboard content={data.functionName} shortcut={{ modifiers: ['cmd'], key: '.' }} />
    <Action.OpenInBrowser url={data.href} shortcut={{ modifiers: ['cmd'], key: ',' }} />
  </ActionPanel>
);
