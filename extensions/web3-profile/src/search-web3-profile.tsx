import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Image, Icon, useNavigation } from "@raycast/api";
import { fetchSuggestions } from "./lib/fetchSuggestions";
import { formatEther, type Address } from "viem";
import { ENS_ADDRESS_RECORDS, fetchEnsRecords, mainnetClient, normalizeEnsName, type EnsRecords } from "./lib/ens";

export default function Command() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ensSuggestions, setEnsSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setEnsSuggestions([]);
    if (searchTerm.length <= 2) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchSuggestions(searchTerm)
      .then((results) => {
        if (!cancelled) setEnsSuggestions(results);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

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

const EMPTY_ENS_RECORDS: EnsRecords = { texts: {}, addresses: {} };

function useEnsProfile(name: string) {
  const [profile, setProfile] = useState<EnsProfile>({ records: EMPTY_ENS_RECORDS });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    async function loadProfile() {
      const normalizedName = normalizeEnsName(name);
      const [avatarText, records] = await Promise.all([
        mainnetClient.getEnsText({ name: normalizedName, key: "avatar" }).catch(() => null),
        fetchEnsRecords(normalizedName),
      ]);
      const address = records.addresses.ethereum as Address | undefined;
      const [avatar, balance] = await Promise.all([
        avatarText && !avatarText.includes("0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7")
          ? mainnetClient.getEnsAvatar({ name: normalizedName }).catch(() => null)
          : null,
        address
          ? mainnetClient
              .getBalance({ address })
              .then(formatEther)
              .catch(() => undefined)
          : undefined,
      ]);

      if (!cancelled) {
        setProfile({
          address: address ?? undefined,
          avatar: avatar ?? undefined,
          balance,
          records,
        });
      }
    }

    loadProfile()
      .catch(() => {
        if (!cancelled) setProfile({ records: EMPTY_ENS_RECORDS });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { profile, isLoading };
}

function ProfileDetail({ name }: { name: string }) {
  const { profile, isLoading } = useEnsProfile(name);
  const { address: ensAddress, avatar: ensAvatar, records: ensRecords, balance } = profile;
  const { texts: ensTextRecords, addresses: ensAddresses } = ensRecords;
  const telegram = ensTextRecords["org.telegram"] ?? ensTextRecords["com.telegram"];
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
              {ensTextRecords["com.instagram"] && (
                <Action.OpenInBrowser
                  title="Open on Instagram"
                  icon="instagram.png"
                  url={`https://instagram.com/${ensTextRecords["com.instagram"]}`}
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
                  {ensTextRecords.pronouns && (
                    <List.Item.Detail.Metadata.Label title="Pronouns" text={ensTextRecords.pronouns} />
                  )}
                  {ensTextRecords.keywords && (
                    <List.Item.Detail.Metadata.TagList title="Keywords">
                      {ensTextRecords.keywords.split(",").map((keyword) => (
                        <List.Item.Detail.Metadata.TagList.Item key={keyword} text={keyword.trim()} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
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
                  {ensTextRecords["com.instagram"] && (
                    <List.Item.Detail.Metadata.Link
                      title="Instagram"
                      text={ensTextRecords["com.instagram"]}
                      target={`https://instagram.com/${ensTextRecords["com.instagram"]}`}
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
