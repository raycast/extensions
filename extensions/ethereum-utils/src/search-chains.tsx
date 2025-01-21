import { ActionPanel, Detail, Icon, List, Action } from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Chain } from './service';

const service = new Service();

export default function Command() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchChains() {
      const chains = await service.getChains();
      console.log(chains[0]);
      setChains(chains);
      setLoading(false);
    }

    fetchChains();
  }, []);

  return (
    <List isLoading={isLoading}>
      {chains.map((chain) => (
        <List.Item
          key={chain.chainId}
          title={chain.name}
          keywords={[
            chain.chain,
            chain.network,
            chain.chainId.toString(),
          ].filter((item) => !!item)}
          accessories={[{ text: chain.chainId.toString() }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.BlankDocument}
                title="Show Details"
                target={<ChainView chain={chain} />}
              />
              <Action.CopyToClipboard
                title="Copy Chain Id"
                content={chain.chainId}
                shortcut={{ key: 'i', modifiers: ['cmd'] }}
              />
              <Action.OpenInBrowser
                title="Open Chain Homepage"
                url={chain.infoURL}
                shortcut={{ key: 'h', modifiers: ['cmd'] }}
              />
              {chain.explorers && chain.explorers[0] && (
                <Action.OpenInBrowser
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
  
  ## RPC URLs

  ${chain.rpc.map((url) => `- ${url}`).join('\n')}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Chain Id"
            content={chain.chainId}
          />
          <Action.OpenInBrowser
            title="Open Chain Homepage"
            url={chain.infoURL}
            shortcut={{ key: 'h', modifiers: ['cmd'] }}
          />
          {chain.explorers && chain.explorers[0] && (
            <Action.OpenInBrowser
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
