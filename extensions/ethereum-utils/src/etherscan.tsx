import {
  Action,
  ActionPanel,
  getSelectedText,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { getFavicon } from '@raycast/utils';
import { useEffect, useState } from 'react';

interface ExplorerConfig {
  name: string;
  baseURL: string;
}

const chains: ExplorerConfig[] = [
  {
    name: 'Etherscan',
    baseURL: 'https://etherscan.io',
  },
  {
    name: 'Blastscan',
    baseURL: 'https://blastscan.io',
  },
  {
    name: 'Basescan',
    baseURL: 'https://basescan.org',
  },
  {
    name: 'Optimism',
    baseURL: 'https://optimistic.etherscan.io',
  },
  {
    name: 'ArbiScan',
    baseURL: 'https://arbiscan.io',
  },
  {
    name: 'BscScan',
    baseURL: 'https://bscscan.com',
  },
];

export default function Command() {
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    getSelectedText()
      .then((selectedText) => {
        const cleanInput = selectedText
          .replace(' ', '')
          .replace(/\n/g, '')
          .replace(/,/g, '');
        if (cleanInput.startsWith('0x') && searchText === '') {
          setSearchText(cleanInput);
        }
      })
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to get selected text',
        });
      });
  }, []);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      {chains.map((chain, index) => (
        <List.Item
          icon={getFavicon(chain.baseURL)}
          key={index}
          title={chain.name}
          subtitle={`Search on ${chain.name}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search"
                url={`${chain.baseURL}/search?f=0&q=${searchText}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
