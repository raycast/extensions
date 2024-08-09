export type Chain = {
  name: string
  chain: string
  icon: string
  rpc: readonly string[]
  features: readonly { name: string }[]
  faucets: readonly { url: string }[]
  nativeCurrency: { name: string; symbol: string; decimals: number }
  infoURL: string
  shortName: string
  chainId: number
  networkId: number
  explorers: readonly { name: string; url: string; standard: string }[]
}
