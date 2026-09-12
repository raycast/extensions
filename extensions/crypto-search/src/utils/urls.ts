import { ChainType } from "./blockchain";

export function getGMGNUrl(chain: ChainType, type: "token" | "address", address: string, maker?: string): string {
  const chainMap: Record<ChainType, string> = {
    solana: "sol",
    ethereum: "eth",
    bsc: "bsc",
    base: "base",
    unknown: "",
  };
  const chainPrefix = chainMap[chain];
  let url = `https://gmgn.ai/${chainPrefix}/${type}/${address}`;
  if (maker) {
    url += `?maker=${maker}`;
  }
  return url;
}

export function getExplorerUrl(chain: ChainType, type: "address" | "tx", value: string): string {
  const explorers: Record<ChainType, string> = {
    solana: `https://solscan.io/${type}/${value}`,
    ethereum: `https://etherscan.io/${type}/${value}`,
    bsc: `https://bscscan.com/${type}/${value}`,
    base: `https://basescan.org/${type}/${value}`,
    unknown: "",
  };

  return explorers[chain] || "";
}

export function getTransactionExplorerUrl(chain: ChainType, txHash: string): string {
  return getExplorerUrl(chain, "tx", txHash);
}
