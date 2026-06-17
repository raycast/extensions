import { useCachedPromise } from '@raycast/utils';
import { useMemo } from 'react';
import TurndownService from 'turndown';
import mediaActions from '../api/mediaActions';

function useTurndown() {
  const { data: ankiMediaPath, isLoading, error } = useCachedPromise(mediaActions.getMediaDirPath);

  const turndown = useMemo((): TurndownService | undefined => {
    if (isLoading || error || !ankiMediaPath) return;

    TurndownService.prototype.escape = (text: string) => text;
    const td = new TurndownService();
    td.addRule('image', {
      filter: 'img',
      replacement: (_, node) => {
        const imgNode = node as HTMLImageElement;
        return `![](<${ankiMediaPath}/${imgNode.getAttribute('src')}>)`;
      },
    });

    td.addRule('ignoreJS', {
      filter: ['script', 'style'],
      replacement: () => '',
    });

    return td;
  }, [ankiMediaPath, isLoading, error]);

  return {
    turndown,
  };
}
export default useTurndown;
