import { Action, ActionPanel, Keyboard } from '@raycast/api';

import { OpenPreferencesAction } from './actions';
import { NewsDetail } from './news-detail';

export function NewsActions({ id, url }: { id: string; url?: string | null }) {
  return (
    <ActionPanel>
      {url ? <Action.OpenInBrowser title="Source" url={url} /> : null}
      <Action.Push
        title="Related"
        target={<NewsDetail id={id} />}
        shortcut={url ? { modifiers: ['shift'], key: 'return' } : undefined}
      />
      <Action.CopyToClipboard
        title="Copy ID"
        content={id}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <OpenPreferencesAction />
    </ActionPanel>
  );
}
