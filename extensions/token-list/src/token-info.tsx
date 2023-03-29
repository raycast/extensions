import { Action, ActionPanel, List } from "@raycast/api";

const explorers: Record<string, string> = {
  ethereum: "https://etherscan.io/token/",
  "polygon-pos": "https://polygonscan.com/token/",
  "binance-smart-chain": "https://bscscan.com/token/",
  solana: "https://solscan.io/token/",
  "arbitrum-one": "https://arbiscan.io/token/",
  avalanche: "https://snowtrace.io/token/",
  fantom: "https://ftmscan.com/token/",
  "optimistic-ethereum": "https://optimistic.etherscan.io/token/",
  "harmony-shard-0": "https://explorer.harmony.one/address/",
  tron: "https://tronscan.org/#/token20/",
  energi: "https://explorer.energi.network/token/",
  "huobi-token": "https://www.hecoinfo.com/en-us/token/",
  aptos: "https://aptoscan.com/coin/",
  astar: "https://blockscout.com/astar/token/",
  cronos: "https://cronoscan.com/token/",
  zksync: "https://explorer.zksync.io/address/",
  xdai: "https://blockscout.com/xdai/mainnet/token/",
};

interface TokenInfoProps {
  name: string;
  platforms: Record<string, string>;
}

function TokenInfo({ name, platforms: platformsObj }: TokenInfoProps) {
  const platforms = Object.entries(platformsObj);

  return (
    <List navigationTitle={name}>
      <List.Section title={`${name}  (${platforms.length} chains)`}>
        {platforms.map(([platform, address], index) => (
          <List.Item
            key={index}
            keywords={[address]}
            title={platform}
            accessories={[{ text: address }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={address} />
                <Action.Paste content={address} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
                {explorers[platform] && (
                  <Action.OpenInBrowser
                    title="Open in Explorer"
                    url={explorers[platform] + address}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default TokenInfo;
