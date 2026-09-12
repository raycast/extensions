import { ActionPanel, List, Action } from '@raycast/api';
import { useEffect, useState } from 'react';
import { isValidName } from 'ethers';
import Service, { NamingServiceRecord } from './service';

const service = new Service();

export default function Command() {
  const [records, setRecords] = useState<NamingServiceRecord[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    async function fetchRecords() {
      if (!isValidName(searchText)) {
        setRecords([]);
        return;
      }
      setLoading(true);
      const ensRecords = await service.lookupEns(searchText);
      setLoading(false);
      setRecords(ensRecords);
    }

    fetchRecords();
  }, [searchText]);

  function handleSearchTextChange(text: string) {
    setSearchText(text);
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={handleSearchTextChange}
      throttle={true}
    >
      {records.map((record) => (
        <List.Item
          key={record.type}
          title={record.value}
          accessories={[{ text: record.type }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={record.value} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
