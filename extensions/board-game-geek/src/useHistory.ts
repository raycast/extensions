import { useCachedState } from '@raycast/utils';

import { BoardGame } from './models';

export default function useHistory() {
  const [history, setHistory] = useCachedState<BoardGame[]>('history', []);

  function addToHistory(item: BoardGame) {
    const updatedHistory = history;

    const index = updatedHistory.findIndex((i) => i.bggId === item.bggId);

    if (index >= 0) {
      updatedHistory.splice(index, 1);
    }

    setHistory([item, ...history]);
  }

  return { history, addToHistory };
}
