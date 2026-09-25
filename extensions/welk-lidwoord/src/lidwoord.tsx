import { Action, ActionPanel, Detail, Keyboard, showToast, Toast } from '@raycast/api';
import { useEffect, useState } from 'react';
import { getSearchByWord } from './api';
import { createLidwoordMarkdown } from './utils';

type Props = {
  arguments: {
    word: string;
  };
};

export default function Command(props: Props) {
  const [result, setResult] = useState<string>();
  const [error, setError] = useState(false);
  const word = props.arguments.word.trim();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await getSearchByWord({
        path: { word },
      });

      if (error) {
        throw new Error('Search request failed');
      }

      setResult(data);
    };
    fetchData().catch(async () => {
      setError(true);
      await showToast({
        style: Toast.Style.Failure,
        title: 'Could not search for word',
      });
    });
  }, []);

  return (
    <Detail
      navigationTitle={`Lidwoord voor ${word}`}
      isLoading={result === undefined && !error}
      markdown={createLidwoordMarkdown(word, result, error)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={result ? result : ''}
            title="Copy Article and Word"
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard content={result?.split(' ')?.[0] ?? ''} title="Copy Article" />
        </ActionPanel>
      }
    />
  );
}
