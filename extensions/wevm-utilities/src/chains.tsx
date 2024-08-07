import { Action, ActionPanel, List } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { useMemo } from 'react'

import { popularChainIds } from './internal/constants'
import type { Chain } from './internal/types'

export default function Command() {
  const { data: chains, isLoading } = useFetch<readonly Chain[]>(
    'https://chainid.network/chains.json',
  )

  const popularChains = useMemo(
    () => chains?.filter((chain) => popularChainIds.includes(chain.chainId)),
    [chains],
  )
  const otherChains = useMemo(
    () => chains?.filter((chain) => !popularChainIds.includes(chain.chainId)),
    [chains],
  )

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="Popular">
        {popularChains?.map((chain) => (
          <List.Item
            key={chain.chainId}
            title={chain.name}
            subtitle={chain.shortName}
            accessories={[{ text: chain.chainId.toString() }]}
            keywords={[chain.chainId.toString(), chain.name]}
            actions={<ChainActions chain={chain} />}
            detail={<ChainDetail chain={chain} />}
          />
        ))}
      </List.Section>
      <List.Section title="All">
        {otherChains?.map((chain) => (
          <List.Item
            key={chain.chainId}
            title={chain.name}
            subtitle={chain.shortName}
            accessories={[{ text: chain.chainId.toString() }]}
            keywords={[chain.chainId.toString(), chain.name]}
            actions={<ChainActions chain={chain} />}
            detail={<ChainDetail chain={chain} />}
          />
        ))}
      </List.Section>
    </List>
  )
}

function ChainActions({ chain }: { chain: Chain }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open in Chainslist"
        url={`https://chainlist.org/chain/${chain.chainId}`}
      />
      {chain.explorers?.[0] && (
        <Action.OpenInBrowser
          shortcut={{ modifiers: ['cmd'], key: 'e' }}
          title="Open Block Explorer"
          url={chain.explorers[0].url}
        />
      )}
    </ActionPanel>
  )
}

function ChainDetail({ chain }: { chain: Chain }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Details" />
          <List.Item.Detail.Metadata.Label title="Name" text={chain.name} />
          <List.Item.Detail.Metadata.Label title="Short Name" text={chain.shortName} />
          <List.Item.Detail.Metadata.Label title="Chain ID" text={chain.chainId.toString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Native Currency" />
          <List.Item.Detail.Metadata.Label title="Name" text={chain.nativeCurrency.name} />
          <List.Item.Detail.Metadata.Label title="Symbol" text={chain.nativeCurrency.symbol} />
          <List.Item.Detail.Metadata.Label
            title="Decimals"
            text={chain.nativeCurrency.decimals.toString()}
          />
          <List.Item.Detail.Metadata.Separator />
          {chain.explorers?.map((explorer, key) => (
            <List.Item.Detail.Metadata.Link
              key={explorer.url}
              title={key === 0 ? `Block Explorer${chain.explorers.length > 1 ? 's' : ''}` : ''}
              text={explorer.url}
              target={explorer.url}
            />
          ))}
          {chain.explorers && <List.Item.Detail.Metadata.Separator />}
          {chain.rpc?.map((url, key) => (
            <List.Item.Detail.Metadata.Link
              key={url}
              title={key === 0 ? `RPC URL${chain.rpc.length > 1 ? 's' : ''}` : ''}
              text={url}
              target={url}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
