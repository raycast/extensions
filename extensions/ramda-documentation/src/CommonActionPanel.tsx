import { Action, ActionPanel } from '@raycast/api';

import type { RamdaFunction } from '../@types';

type CommonActionPanelProps = {
  data: RamdaFunction;
};

export const CommonActionPanel = ({ data, children }: React.PropsWithChildren<CommonActionPanelProps>) => (
  <ActionPanel>
    {children}
    <Action.CopyToClipboard content={data.functionName} shortcut={{ modifiers: ['cmd'], key: '.' }} />
    <Action.OpenInBrowser url={data.href} shortcut={{ modifiers: ['cmd'], key: ',' }} />
  </ActionPanel>
);
