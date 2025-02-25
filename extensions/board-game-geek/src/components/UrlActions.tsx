import { Action } from '@raycast/api';

import useHistory from '../useHistory';
import { BoardGame } from '../models';

interface UrlActionsProps {
  item: BoardGame;
}

export default function UrlActions({ item }: UrlActionsProps) {
  const { addToHistory } = useHistory();

  return (
    <>
      <Action.OpenInBrowser url={item.url} onOpen={() => addToHistory(item)} />
      <Action.CopyToClipboard
        content={item.url}
        onCopy={() => addToHistory(item)}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
      />
    </>
  );
}
