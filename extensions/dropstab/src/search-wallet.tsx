import { ActionPanel, List, Action, showToast, Icon, Clipboard, Toast, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { getFavorites, addToFavorites, removeFromFavorites, isFavorite } from "./commands/dropstabWalletsCommands";
import { WalletSearchResult } from "./types/walletType";
import { TransactionSearchResult } from "./types/txHashType";

interface CommandArguments {
  startAddressOrHash?: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { startAddressOrHash } = props.arguments;
  const [input, setInput] = useState<string>(startAddressOrHash || "");
  const [favorites, setFavorites] = useState<(WalletSearchResult | TransactionSearchResult)[]>([]);
  const [searchResults, setSearchResults] = useState<(WalletSearchResult | TransactionSearchResult)[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWallet, setIsWallet] = useState<boolean>(true);

  useEffect(() => {
    setFavorites(getFavorites());
    setIsLoading(false);

    if (startAddressOrHash) {
      updateSearchResults(startAddressOrHash);
    }
  }, [startAddressOrHash]);

  const handleSearchTextChange = (text: string) => {
    setInput(text);
    updateSearchResults(text);
  };

  const updateSearchResults = (input: string) => {
    if (
      isValidEthereumAddress(input) ||
      isValidTronAddress(input) ||
      isValidSolanaAddress(input) ||
      isValidBitcoinAddress(input)
    ) {
      setIsWallet(true);
      const results = getWalletLinks(input).map((link, index) => ({
        id: `${input}-${index}`,
        name: input,
        url: link.url,
        icon: link.icon,
        network: link.title,
      }));
      setSearchResults(results);
    } else if (isValidEthereumHash(input) || isValidBitcoinHash(input)) {
      setIsWallet(false);
      const results = getTransactionLinks(input).map((link, index) => ({
        id: `${input}-${index}`,
        name: input,
        url: link.url,
        icon: link.icon,
        network: link.title,
      }));
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const isValidEthereumAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);
  const isValidTronAddress = (address: string) => /^T[a-zA-Z0-9]{33}$/.test(address);
  const isValidSolanaAddress = (address: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  const isValidBitcoinAddress = (address: string) =>
    /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address) || /^(bc1)[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address);

  const isValidEthereumHash = (hash: string) => /^0x([A-Fa-f0-9]{64})$/.test(hash);
  const isValidBitcoinHash = (hash: string) => /^[A-Fa-f0-9]{64}$/.test(hash);

  const getWalletLinks = (address: string) => {
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

  const getTransactionLinks = (hash: string) => {
    const etherscanUrl = `https://etherscan.io/tx/${hash}`;
    const arbiscanUrl = `https://arbiscan.io/tx/${hash}`;
    const zkscanUrl = `https://explorer.zksync.io/tx/${hash}`;
    const optimismUrl = `https://optimistic.etherscan.io/tx/${hash}`;
    const baseUrl = `https://basescan.org/tx/${hash}`;
    const bscUrl = `https://bscscan.com/tx/${hash}`;
    const avaxUrl = `https://snowtrace.io/tx/${hash}`;
    const maticUrl = `https://polygonscan.com/tx/${hash}`;
    const ftmUrl = `https://ftmscan.com/tx/${hash}`;
    const injUrl = `https://explorer.injective.network/tx/${hash}`;
    const mntUrl = `https://explorer.mantle.xyz/tx/${hash}`;
    const mantaUrl = `https://manta.socialscan.io/tx/${hash}`;
    const lineaUrl = `https://explorer.linea.build/tx/${hash}`;
    const scrollUrl = `https://scrollscan.com/tx/${hash}`;
    const blastUrl = `https://blastscan.io/tx/${hash}`;

    const btcUrl = `https://www.blockchain.com/btc/tx/${hash}`;

    const links = [];

    if (isValidEthereumHash(hash)) {
      links.push(
        { title: "View on Etherscan", url: etherscanUrl, icon: "ethereum.png", network: "eth" },
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
    if (isValidBitcoinHash(hash)) {
      links.push({ title: "View on Blockchain.com", url: btcUrl, icon: "bitcoin.png", network: "btc" });
    }
    return links;
  };

  const handleAddToFavorites = (link: WalletSearchResult | TransactionSearchResult) => {
    const newFavorite = {
      id: link.id,
      name: link.name,
      network: link.network,
      icon: link.icon,
      url: link.url,
    };
    if (isWallet) {
      addToFavorites(newFavorite, favorites, setFavorites);
    } else {
      addToFavorites(newFavorite, favorites, setFavorites);
    }
  };

  const handleRemoveFromFavorites = (favorite: WalletSearchResult | TransactionSearchResult) => {
    if (isWallet) {
      removeFromFavorites(favorite, favorites, setFavorites);
    } else {
      removeFromFavorites(favorite, favorites, setFavorites);
    }
  };

  return (
    <List
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Enter wallet address or transaction hash..."
      throttle
      searchText={input} // используем начальный адрес или хэш, если он есть
      isLoading={isLoading}
    >
      {!input && favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((favorite, index) => (
            <List.Item
              key={`${favorite.id}-${favorite.network}-${index}`}
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
                  <Action
                    title="Copy Address or Hash"
                    onAction={() => Clipboard.copy(favorite.id)}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Search Results">
        {input && searchResults.length > 0
          ? searchResults.map((link, index) => (
              <List.Item
                key={`${link.id}-${link.network}-${index}`}
                icon={link.icon}
                title={input}
                accessories={[{ text: `${link.network}` }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title={link.network} url={link.url} />
                    {isFavorite(link, favorites) ? (
                      <Action
                        title="Remove from Favorites"
                        onAction={() => handleRemoveFromFavorites(link)}
                        icon={Icon.Star}
                      />
                    ) : (
                      <Action title="Add to Favorites" onAction={() => handleAddToFavorites(link)} icon={Icon.Star} />
                    )}
                    <Action title="Copy Address or Hash" onAction={() => Clipboard.copy(input)} icon={Icon.Clipboard} />
                  </ActionPanel>
                }
              />
            ))
          : input && (
              <List.Item
                title="Invalid Wallet Address or Transaction Hash"
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Error"
                      onAction={() => showToast(Toast.Style.Failure, "Invalid Wallet Address or Transaction Hash")}
                    />
                  </ActionPanel>
                }
              />
            )}
      </List.Section>
    </List>
  );
}
