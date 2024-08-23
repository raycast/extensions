import { ActionPanel, List, Action, showToast, Icon, Clipboard, Toast, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getFavorites,
  addToFavorites,
  removeFromFavoritesForWallets,
  isFavoriteForWallets,
} from "./commands/dropstabWalletsCommands";
import { WalletSearchResult } from "./types/walletType";

const WALLET_FAVORITES_KEY = "walletFavorites";

interface CommandArguments {
  startAddress?: string;
}

export default function SearchWalletCommand(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { startAddress } = props.arguments;
  const [walletAddress, setWalletAddress] = useState<string>(startAddress || "");
  const [favorites, setFavorites] = useState<WalletSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<WalletSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setFavorites(getFavorites(WALLET_FAVORITES_KEY));
    setIsLoading(false);

    if (startAddress) {
      updateSearchResults(startAddress);
    }
  }, [startAddress]);

  const handleSearchTextChange = (text: string) => {
    setWalletAddress(text);
    updateSearchResults(text);
  };

  const updateSearchResults = (address: string) => {
    const results = getLinks(address).map((link) => ({
      id: address,
      name: address,
      url: link.url,
      icon: link.icon,
      network: link.title,
    }));
    setSearchResults(results);
  };

  const isValidEthereumAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);
  const isValidTronAddress = (address: string) => /^T[a-zA-Z0-9]{33}$/.test(address);
  const isValidSolanaAddress = (address: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  const isValidBitcoinAddress = (address: string) =>
    /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address) || /^(bc1)[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address);

  const getLinks = (address: string) => {
    const etherscanUrl = `https://etherscan.io/address/${address}`;
    const arbiscanUrl = `https://arbiscan.io/address/${address}`;
    const zkscanUrl = `https://explorer.zksync.io/address/${address}`;
    const optimismUrl = `https://optimistic.etherscan.io/address/${address}`;
    const baseUrl = `https://basescan.org/address/${address}`;
    const debankUrl = `https://debank.com/profile/${address}`;
    const bscUrl = `https://bscscan.com/address/${address}`;
    const avaxUrl = `https://snowtrace.io/address/${address}`;
    const maticUrl = `https://polygonscan.com/address/${address}`;
    const ftmUrl = `https://ftmscan.com/address/${address}`;
    const injUrl = `https://explorer.injective.network/account/${address}`;
    const mntUrl = `https://explorer.mantle.xyz/address/${address}`;
    const mantaUrl = `https://manta.socialscan.io/address/${address}`;
    const lineaUrl = `https://explorer.linea.build/address/${address}`;
    const scrollUrl = `https://scrollscan.com/address/${address}`;
    const blastUrl = `https://blastscan.io/address/${address}`;

    const tronscanUrl = `https://tronscan.org/#/address/${address}`;
    const solscanUrl = `https://solscan.io/account/${address}`;
    const btcUrl = `https://www.blockchain.com/btc/address/${address}`;

    const links = [];

    if (isValidEthereumAddress(address)) {
      links.push(
        { title: "View on Etherscan", url: etherscanUrl, icon: "ethereum.png", network: "eth" },
        { title: "View on Debank", url: debankUrl, icon: "debank.png", network: "debank" },
        { title: "View on Arbiscan", url: arbiscanUrl, icon: "arbitrum.png", network: "arb" },
        { title: "View on Zkscan", url: zkscanUrl, icon: "zksync.png", network: "zksync" },
        { title: "View on Optimism", url: optimismUrl, icon: "optimism.png", network: "optimism" },
        { title: "View on Base", url: baseUrl, icon: "base.png", network: "base" },
        { title: "View on BscScan", url: bscUrl, icon: "bsc.png", network: "bsc" },
        { title: "View on Snowtrace", url: avaxUrl, icon: "avax.png", network: "avax" },
        { title: "View on Polygonscan", url: maticUrl, icon: "matic.png", network: "matic" },
        { title: "View on FtmScan", url: ftmUrl, icon: "ftm.png", network: "ftm" },
        { title: "View on Injective", url: injUrl, icon: "inj.png", network: "inj" },
        { title: "View on Mantle", url: mntUrl, icon: "mnt.png", network: "mnt" },
        { title: "View on Manta", url: mantaUrl, icon: "manta.png", network: "manta" },
        { title: "View on Linea", url: lineaUrl, icon: "linea.png", network: "linea" },
        { title: "View on Scroll", url: scrollUrl, icon: "scroll.png", network: "scroll" },
        { title: "View on Blast", url: blastUrl, icon: "blast.png", network: "blast" },
      );
    }
    if (isValidBitcoinAddress(address)) {
      links.push({ title: "View on Blockchain.com", url: btcUrl, icon: "bitcoin.png", network: "btc" });
    }
    if (isValidSolanaAddress(address)) {
      links.push({ title: "View on Solscan", url: solscanUrl, icon: "solana.png", network: "solana" });
    }
    if (isValidTronAddress(address)) {
      links.push({ title: "View on Tronscan", url: tronscanUrl, icon: "tron.png", network: "tron" });
    }
    return links;
  };

  const handleAddToFavorites = (link: WalletSearchResult) => {
    const newFavorite: WalletSearchResult = {
      id: link.id,
      name: link.name,
      network: link.network,
      icon: link.icon,
      url: link.url,
    };
    addToFavorites(newFavorite, favorites, setFavorites, WALLET_FAVORITES_KEY);
  };

  const handleRemoveFromFavorites = (favorite: WalletSearchResult) => {
    removeFromFavoritesForWallets(favorite, favorites, setFavorites, WALLET_FAVORITES_KEY);
  };

  return (
    <List
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Enter wallet address..."
      throttle
      searchText={walletAddress} // используем начальный адрес, если он есть
      isLoading={isLoading}
    >
      {!walletAddress && favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((favorite) => {
            return (
              <List.Item
                key={`${favorite.id}-${favorite.network}`}
                icon={favorite.icon}
                title={favorite.name}
                accessories={[{ text: favorite.network }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title={favorite.network} url={favorite.url} />
                    <Action
                      title="Remove from Favorites"
                      onAction={() => handleRemoveFromFavorites(favorite)}
                      icon={Icon.Star}
                    />
                    <Action title="Copy Address" onAction={() => Clipboard.copy(favorite.id)} icon={Icon.Clipboard} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <List.Section title="Search Results">
        {walletAddress && searchResults.length > 0
          ? searchResults.map((link) => (
              <List.Item
                key={link.url}
                icon={link.icon}
                title={walletAddress}
                accessories={[{ text: `${link.network}` }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title={link.network} url={link.url} />
                    {isFavoriteForWallets(link, favorites) ? (
                      <Action
                        title="Remove from Favorites"
                        onAction={() => handleRemoveFromFavorites(link)}
                        icon={Icon.Star}
                      />
                    ) : (
                      <Action title="Add to Favorites" onAction={() => handleAddToFavorites(link)} icon={Icon.Star} />
                    )}
                    <Action title="Copy Address" onAction={() => Clipboard.copy(walletAddress)} icon={Icon.Clipboard} />
                  </ActionPanel>
                }
              />
            ))
          : walletAddress && (
              <List.Item
                title="Invalid Wallet Address"
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Error"
                      onAction={() => showToast(Toast.Style.Failure, "Invalid Wallet Address")}
                    />
                  </ActionPanel>
                }
              />
            )}
      </List.Section>
    </List>
  );
}
