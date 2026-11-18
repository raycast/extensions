import { useCachedPromise } from '@raycast/utils';
import { useMemo } from 'react';
import TurndownService from 'turndown';
import mediaActions from '../api/mediaActions';

function useTurndown() {
  const { data: ankiMediaPath, isLoading, error } = useCachedPromise(mediaActions.getMediaDirPath);

  const turndown = useMemo((): TurndownService | undefined => {
    if (!ankiMediaPath) return;

    const td = new TurndownService();
    td.escape = (text: string) => text;
    td.addRule('image', {
      filter: 'img',
      replacement: (_, node) => {
        const imgNode = node as HTMLImageElement;
        const src = imgNode.getAttribute('src');
        if (!src) return '';
        const imagePath = /^(?:https?:|data:|file:|\/)/i.test(src)
          ? src
          : `${ankiMediaPath}/${src}`;
        return `![](<${imagePath}>)`;
      },
    });

    td.addRule('ignoreJS', {
      filter: ['script', 'style'],
      replacement: () => '',
    });

    return td;
  }, [ankiMediaPath]);

  return {
    turndown,
    isLoading,
    error,
  };
}
export default useTurndown;
