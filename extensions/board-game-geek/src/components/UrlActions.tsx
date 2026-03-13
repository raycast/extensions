import { Action } from '@raycast/api';

import { BoardGame } from '../models';

interface UrlActionsProps {
  item: BoardGame;
}

export default function UrlActions({ item }: UrlActionsProps) {
  return (
    <>
      <Action.OpenInBrowser url={item.url} />
      <Action.CopyToClipboard content={item.url} shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }} />
    </>
  );
}
