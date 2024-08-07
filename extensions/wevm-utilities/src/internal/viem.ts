import {
  http,
  type PublicClient,
  type Transport,
  createPublicClient,
  extractChain,
  fallback,
} from 'viem'
import * as chains from 'viem/chains'

import type { Chain } from './types'

export function getViemClient(chain: Chain) {
  const chain_ = chain.chainId
    ? extractChain({
        chains: Object.values(chains),
        id: Number(chain.chainId) as any,
      })
    : undefined
  return createPublicClient({
    chain: chain_,
    transport: fallback(
      chain.rpc
        .map((rpc) => (rpc.startsWith('http') ? http(rpc) : undefined))
        .filter(Boolean) as Transport[],
    ),
  }) as PublicClient
}
