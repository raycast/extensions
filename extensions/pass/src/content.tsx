import { ActionPanel, Action, List, Icon } from '@raycast/api';
import { useEffect, useState, useMemo } from 'react';
import { decrypt } from './pass';

interface Row {
  idx: number;
  name: string;
  value: string;
}

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

function ContentRow(row: Row) {
  const [show, setShow] = useState<boolean>(false);

  const { toggleTitle, toggleIcon, itemTitle } = useMemo(() => {
    return show
      ? {
          toggleTitle: 'Hide Value',
          toggleIcon: Icon.EyeDisabled,
          itemTitle: row.name + ': ' + row.value,
        }
      : {
          toggleTitle: 'Show Value',
          toggleIcon: Icon.Eye,
          itemTitle: row.name,
        };
  }, [show]);

  return (
    <List.Item
      key={row.idx}
      icon={Icon.Key}
      title={itemTitle}
      actions={
        <ActionPanel>
          <Action.Paste content={row.value} />
          <Action.CopyToClipboard content={row.value} shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }} />
          <Action
            icon={toggleIcon}
            title={toggleTitle}
            onAction={() => setShow(!show)}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'h' }}
          />
        </ActionPanel>
      }
    />
  );
}

interface ContentProps {
  storepath: string;
  file: string;
}

export default function Content({ storepath, file }: ContentProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const decrypted = await decrypt(file, storepath);
        setRows(parseRows(decrypted));
      } catch (error) {
        console.error('Failed to fetch password content:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [file]);

  return (
    <List isLoading={isLoading}>
      {rows.map((row) => (
        <ContentRow key={row.idx} {...row} />
      ))}
    </List>
  );
}
