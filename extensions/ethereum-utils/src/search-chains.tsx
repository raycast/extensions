import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  Icon,
  List,
  ListItem,
  OpenInBrowserAction,
  PushAction,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Chain } from './service';

const service = new Service();

export default function Command() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchChains() {
      const chains = await service.getChains();
      setChains(chains);
      setLoading(false);
    }

    fetchChains();
  }, []);

  return (
    <List isLoading={isLoading}>
      {chains.map((chain) => (
        <ListItem
          key={chain.chainId}
          title={chain.name}
          keywords={[chain.chain, chain.network, chain.chainId.toString()]}
          accessoryTitle={chain.chainId.toString()}
          actions={
            <ActionPanel>
              <PushAction
                icon={Icon.TextDocument}
                title="Show Details"
                target={<ChainView chain={chain} />}
              />
              <CopyToClipboardAction
                title="Copy Chain Id"
                content={chain.chainId}
                shortcut={{ key: 'i', modifiers: ['cmd'] }}
              />
              <OpenInBrowserAction
                title="Open Chain Homepage"
                url={chain.infoURL}
                shortcut={{ key: 'h', modifiers: ['cmd'] }}
              />
              {chain.explorers && chain.explorers[0] && (
                <OpenInBrowserAction
                  title="Open Chain Explorer"
                  url={chain.explorers[0].url}
                  shortcut={{ key: 'e', modifiers: ['cmd'] }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface ChainProps {
  chain: Chain;
}

function ChainView(props: ChainProps) {
  const { chain } = props;

  const markdown = `
  # ${chain.name}

  ## Chain Id

  ${chain.chainId}

  ## Native Currency

  ${chain.nativeCurrency.name} (${chain.nativeCurrency.symbol})

  ## Homepage

  [${chain.infoURL}](${chain.infoURL})
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <CopyToClipboardAction
            title="Copy Chain Id"
            content={chain.chainId}
          />
          <OpenInBrowserAction
            title="Open Chain Homepage"
            url={chain.infoURL}
            shortcut={{ key: 'h', modifiers: ['cmd'] }}
          />
          {chain.explorers && chain.explorers[0] && (
            <OpenInBrowserAction
              title="Open Chain Explorer"
              url={chain.explorers[0].url}
              shortcut={{ key: 'e', modifiers: ['cmd'] }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
