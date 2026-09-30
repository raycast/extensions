import { ActionPanel, Action, List, Icon } from '@raycast/api';
import { useEffect, useState } from 'react';
import { list } from './pass';
import Content from './content';

interface StoreProps {
  storepath: string;
}

export default function Store({ storepath }: StoreProps) {
  const [rows, setRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const files = await list(storepath);
        setRows(files);
      } catch (error) {
        console.error('Failed to fetch file list:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFiles();
  }, [storepath]);

  return (
    <List isLoading={isLoading}>
      {rows.map((file) => (
        <List.Item
          key={file}
          icon={Icon.Lock}
          title={file}
          actions={
            <ActionPanel>
              <Action.Push title={'Show Password Content'} target={<Content storepath={storepath} file={file} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
