const chainIdToName: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  43114: "avalanche",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  1088: "metis",
  100: "gnosis",
  56: "bsc",
  250: "fantom",
  324: "zksync",
  534352: "scroll",
  42220: "celo",
  59144: "linea",
  1101: "polygonzkevm",
  5000: "mantle",
  1666600000: "harmonyone",
  146: "sonic",
  1868: "soneium",
  60808: "bob",
  57073: "ink",
  9745: "plasma",
};

const chainNameToIcon: Record<string, string> = {
  ethereum: "ethereum.svg",
  polygon: "polygon.svg",
  avalanche: "avalanche.svg",
  arbitrum: "arbitrum.svg",
  optimism: "optimism.svg",
  base: "base.svg",
  metis: "metis.svg",
  gnosis: "gnosis.svg",
  bsc: "binance.svg",
  fantom: "fantom.svg",
  zksync: "zksync.svg",
  scroll: "scroll.svg",
  celo: "celo.svg",
  linea: "linea.svg",
  polygonzkevm: "polygonzkevm.svg",
  mantle: "mantle.svg",
  harmonyone: "harmonyone.svg",
  sonic: "sonic.svg",
  soneium: "soneium.svg",
  bob: "bob.svg",
  ink: "ink.svg",
  plasma: "plasma.svg",
};

export function getChainIcon(chainId: number): string {
  const chainName = chainIdToName[chainId];
  if (!chainName) return "unknown.svg";

  return chainNameToIcon[chainName] || "unknown.svg";
}
