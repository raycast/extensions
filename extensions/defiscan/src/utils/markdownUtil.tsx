import { DefichainStats } from "../models/defichainStats";

export function getStatsSummary(stats: DefichainStats): string {
  return `# DefiChain Stats  
  
Block **${stats.blockHeight}**

DFI **${stats.dfiPrice.toFixed(2)} USD**

${stats.amountAuctions} Auctions, ${stats.amountVaults} Vaults, Difficulty ${stats.difficulty} G

---

## masternodes

count **${stats.masternode.total}**

(5 year frozen: ${stats.masternode.frozen5yr}, 10 year frozen ${stats.masternode.frozen10yr})
`;
}
