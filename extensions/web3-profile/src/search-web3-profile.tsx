import { useState } from "react";
import { ActionPanel, List, Action, Image, Icon, useNavigation } from "@raycast/api";
import { QueryClient, QueryClientProvider, useQueries, useQuery } from "@tanstack/react-query";
import {
  getBalanceQueryOptions,
  getEnsAddressQueryOptions,
  getEnsAvatarQueryOptions,
  getEnsTextQueryOptions,
  hashFn,
  structuralSharing,
} from "@wagmi/core/query";
import { fetchSuggestions } from "./lib/fetchSuggestions";
import { type Address } from "viem";
import { mainnet } from "viem/chains";
import {
  decodeEnsAddress,
  ENS_ADDRESS_RECORD_ENTRIES,
  ENS_ADDRESS_RECORDS,
  ENS_TEXT_RECORD_KEYS,
  normalizeEnsName,
  wagmiConfig,
  type EnsRecords,
} from "./lib/ens";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: hashFn,
      retry: 1,
      staleTime: 60_000,
      structuralSharing,
    },
  },
});

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchWeb3Profile />
    </QueryClientProvider>
  );
}

function SearchWeb3Profile() {
  const [searchTerm, setSearchTerm] = useState("");
  const suggestionsQuery = useQuery({
    queryKey: ["ensSuggestions", searchTerm.toLowerCase()],
    queryFn: () => fetchSuggestions(searchTerm),
    enabled: searchTerm.length > 2,
  });
  const ensSuggestions = suggestionsQuery.data ?? [];
  const isLoading = suggestionsQuery.isFetching;

  let title;

  if (searchTerm.length === 0 && ensSuggestions.length === 0) {
    title = "Search for ENS name";
  }

  if (searchTerm.length > 0 && searchTerm.length < 3) {
    title = "Type at least 3 characters to search...";
  }

  if (searchTerm.length > 2 && ensSuggestions.length === 0) {
    title = "No results";
  }

  if (searchTerm.length > 2 && isLoading) {
    title = "Loading...";
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="ENS search" onSearchTextChange={setSearchTerm} throttle>
      <List.EmptyView title={title} icon={{ source: { light: "icon-light.png", dark: "icon-dark.png" } }} />

      {ensSuggestions.map((name) => (
        <List.Item
          key={name}
          title={name}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Profile"
                icon={Icon.AppWindowSidebarLeft}
                target={<ProfileDetail name={name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface EnsProfile {
  address?: Address;
  avatar?: string;
  balance?: string;
  records: EnsRecords;
}

function useEnsProfile(name: string) {
  let normalizedName: string | undefined;
  try {
    normalizedName = normalizeEnsName(name);
  } catch {
    normalizedName = undefined;
  }
  const enabled = normalizedName !== undefined;

  const avatarQuery = useQuery({
    ...getEnsAvatarQueryOptions(wagmiConfig, { name: normalizedName, chainId: mainnet.id }),
    enabled,
  });
  const textQueries = useQueries({
    queries: ENS_TEXT_RECORD_KEYS.map((key) => ({
      ...getEnsTextQueryOptions(wagmiConfig, { name: normalizedName, key, chainId: mainnet.id }),
      enabled,
    })),
  });
  const addressQueries = useQueries({
    queries: ENS_ADDRESS_RECORD_ENTRIES.map(([, { coinType }]) => ({
      ...getEnsAddressQueryOptions(wagmiConfig, { name: normalizedName, coinType, chainId: mainnet.id }),
      enabled,
    })),
  });

  const records: EnsRecords = {
    texts: Object.fromEntries(
      ENS_TEXT_RECORD_KEYS.flatMap((key, index) => (textQueries[index].data ? [[key, textQueries[index].data]] : []))
    ),
    addresses: Object.fromEntries(
      ENS_ADDRESS_RECORD_ENTRIES.flatMap(([key, { coinType }], index) => {
        const rawAddress = addressQueries[index].data;
        const address = rawAddress ? decodeEnsAddress(rawAddress, coinType) : undefined;
        return address ? [[key, address]] : [];
      })
    ),
  };
  const address = records.addresses.ethereum as Address | undefined;
  const balanceQuery = useQuery({
    ...getBalanceQueryOptions(wagmiConfig, { address, chainId: mainnet.id }),
    enabled: address !== undefined,
  });
  const profile: EnsProfile = {
    address,
    avatar: avatarQuery.data ?? undefined,
    balance: balanceQuery.data?.formatted,
    records,
  };
  const isLoading =
    enabled &&
    (avatarQuery.isPending ||
      textQueries.some((query) => query.isPending) ||
      addressQueries.some((query) => query.isPending) ||
      (address !== undefined && balanceQuery.isPending));

  return { profile, isLoading };
}

function ProfileDetail({ name }: { name: string }) {
  const { profile, isLoading } = useEnsProfile(name);
  const { address: ensAddress, avatar: ensAvatar, records: ensRecords, balance } = profile;
  const { texts: ensTextRecords, addresses: ensAddresses } = ensRecords;
  const telegram = ensTextRecords["org.telegram"];
  const { pop } = useNavigation();

  return isLoading ? (
    <List isLoading searchBarPlaceholder={name} enableFiltering={false}>
      <List.EmptyView title="Loading" description="Looking up ENS records and NFT collection. Hold tight!" />
    </List>
  ) : (
    <List isShowingDetail searchBarPlaceholder={name} enableFiltering={false} onSearchTextChange={() => pop()}>
      <List.Section title="Overview">
        <List.Item
          title="ENS Profile"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open on Rainbow Web"
                icon={{ source: "rainbow.png" }}
                url={`https://rainbow.me/${name}`}
              />
              {ensAddress && (
                <Action.OpenInBrowser
                  title="Open on Etherscan"
                  icon={{ source: { light: "etherscan.png", dark: "etherscan-dark.png" } }}
                  url={`https://etherscan.io/address/${ensAddress}`}
                />
              )}
              {ensAddress && (
                <Action.OpenInBrowser
                  title="Open on OpenSea"
                  icon="opensea.png"
                  url={`https://opensea.io/${ensAddress}`}
                />
              )}
              {ensTextRecords["com.github"] && (
                <Action.OpenInBrowser
                  title="Open on GitHub"
                  icon={{ source: { light: "github.png", dark: "github-dark.png" } }}
                  url={`https://github.com/${ensTextRecords["com.github"]}`}
                />
              )}
              {ensTextRecords["com.twitter"] && (
                <Action.OpenInBrowser
                  title="Open on Twitter"
                  icon="twitter.png"
                  url={`https://twitter.com/${ensTextRecords["com.twitter"]}`}
                />
              )}
              {ensAddress && <Action.CopyToClipboard title="Copy Address" content={ensAddress} />}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {ensAvatar && (
                    <List.Item.Detail.Metadata.Label
                      title="Avatar"
                      icon={{ source: ensAvatar, mask: Image.Mask.Circle }}
                    />
                  )}
                  {ensTextRecords.description && (
                    <List.Item.Detail.Metadata.Label title="Description" text={ensTextRecords.description} />
                  )}
                  {ensTextRecords.url && (
                    <List.Item.Detail.Metadata.Link title="URL" text={ensTextRecords.url} target={ensTextRecords.url} />
                  )}
                  {ensTextRecords.website && (
                    <List.Item.Detail.Metadata.Link
                      title="Website"
                      text={ensTextRecords.website}
                      target={ensTextRecords.website}
                    />
                  )}
                  {ensTextRecords.email && (
                    <List.Item.Detail.Metadata.Label title="Email" text={ensTextRecords.email} />
                  )}
                  {ensTextRecords["com.github"] && (
                    <List.Item.Detail.Metadata.Link
                      title="GitHub"
                      text={ensTextRecords["com.github"]}
                      target={`https://github.com/${ensTextRecords["com.github"]}`}
                    />
                  )}
                  {ensTextRecords["com.twitter"] && (
                    <List.Item.Detail.Metadata.Link
                      title="Twitter"
                      text={`@${ensTextRecords["com.twitter"]}`}
                      target={`https://twitter.com/${ensTextRecords["com.twitter"]}`}
                    />
                  )}
                  {ensTextRecords["com.discord"] && (
                    <List.Item.Detail.Metadata.Label title="Discord" text={ensTextRecords["com.discord"]} />
                  )}
                  {telegram && (
                    <List.Item.Detail.Metadata.Link
                      title="Telegram"
                      text={telegram}
                      target={`https://t.me/${telegram.replace(/^@/, "")}`}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
        <List.Item
          title="Wallet"
          actions={
            <ActionPanel>
              {ensAddress && <Action.CopyToClipboard title="Copy Address" content={ensAddress} />}
              {ensAddress && (
                <Action.OpenInBrowser
                  title="Open on Etherscan"
                  icon={{ source: { light: "etherscan.png", dark: "etherscan-dark.png" } }}
                  url={`https://etherscan.io/address/${ensAddress}`}
                />
              )}
              <Action.OpenInBrowser
                title="Open on Rainbow Web"
                icon={{ source: "rainbow.png" }}
                url={`https://rainbow.me/${name}`}
              />
              {ensAddress && (
                <Action.OpenInBrowser
                  title="Open on OpenSea"
                  icon="opensea.png"
                  url={`https://opensea.io/${ensAddress}`}
                />
              )}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {Object.entries(ENS_ADDRESS_RECORDS).map(([key, { label }]) => {
                    const address = ensAddresses[key as keyof typeof ENS_ADDRESS_RECORDS];
                    return address ? <List.Item.Detail.Metadata.Label key={key} title={label} text={address} /> : null;
                  })}
                  {balance !== undefined && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Ethereum Balance"
                        text={`${Number(balance).toFixed(2)} ETH`}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
    </List>
  );
}
