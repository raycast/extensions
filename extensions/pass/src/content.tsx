import { ActionPanel, Action, List, Icon } from '@raycast/api';
import { useEffect, useState } from 'react';
import { decrypt } from './gpg';

type Row = {
  idx: number;
  name: string;
  value: string;
};

function parseRows(content: string): Row[] {
  const [pass, ...extra] = content.split('\n');
  return [
    { idx: 0, name: 'pass', value: pass },
    ...extra
      .filter((s) => !!s)
      .map((s, idx) => {
        const [name, value] = s.split(/:\s?/);
        return { idx: idx + 1, name, value };
      }),
  ];
}

interface ContentProps {
  path: string;
}

export default function Content({ path }: ContentProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const decrypted = await decrypt(path);
        setRows(parseRows(decrypted));
      } catch (error) {
        console.error('Failed to fetch password content:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [path]);

  return (
    <List isLoading={isLoading}>
      {rows.map((row) => (
        <List.Item
          key={row.idx}
          icon={Icon.Key}
          title={row.name}
          actions={
            <ActionPanel>
              <Action.Paste content={row.value} />
              <Action.CopyToClipboard content={row.value} shortcut={{ modifiers: ['cmd'], key: 'c' }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
