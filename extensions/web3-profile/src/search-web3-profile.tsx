import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Image, Icon, useNavigation } from "@raycast/api";
import { fetchSuggestions } from "./lib/fetchSuggestions";
import { WagmiConfig, createClient, useEnsAddress, useEnsAvatar, useBalance, useEnsResolver } from "wagmi";
import { getDefaultProvider } from "ethers";
import { useEnsRecords } from "./lib/useEnsRecords";

const client = createClient({
  autoConnect: true,
  provider: getDefaultProvider(),
});

export default function Command() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ensSuggestions, setEnsSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setEnsSuggestions([]);

    fetchSuggestions(
      searchTerm,
      (results: string[]) => {
        setEnsSuggestions(results);
      },
      setIsLoading
    );
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
                target={
                  <WagmiConfig client={client}>
                    <ProfileDetail name={name} />
                  </WagmiConfig>
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProfileDetail({ name }: { name: string }) {
  const [shouldFetchAvatar, setShouldFetchAvatar] = useState(false);

  const { data: ensAvatar, isLoading: isEnsAvatarLoading } = useEnsAvatar({
    addressOrName: name,
    enabled: shouldFetchAvatar,
  });
  const { data: ensAddress, isLoading: isEnsAddressLoading } = useEnsAddress({ name });
  const { data: ensRecords, isLoading: isEnsRecordsLoading } = useEnsRecords({ name });
  const { data: balance, isLoading: isBalanceLoading } = useBalance({ addressOrName: name });

  const { pop } = useNavigation();

  useEnsResolver({
    name,
    onSuccess: async (resolver) => {
      if (!resolver) return;
      const avatarText = await resolver.getText("avatar");

      // Ignore Avatars that use the Zora Contract
      // https://github.com/ensdomains/ens-avatar/issues/21
      if (avatarText && !avatarText.includes("0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7")) {
        setShouldFetchAvatar(true);
      }
    },
  });

  const isLoading = isEnsAddressLoading || isEnsAvatarLoading || isEnsRecordsLoading || isBalanceLoading;

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
              <Action.OpenInBrowser
                title="Open on Etherscan"
                icon={{ source: { light: "etherscan.png", dark: "etherscan-dark.png" } }}
                url={`https://etherscan.io/address/${ensAddress}`}
              />
              <Action.OpenInBrowser
                title="Open on OpenSea"
                icon="opensea.png"
                url={`https://opensea.io/${ensAddress}`}
              />
              {ensRecords && ensRecords["com.github"] && (
                <Action.OpenInBrowser
                  title="Open on GitHub"
                  icon={{ source: { light: "github.png", dark: "github-dark.png" } }}
                  url={`https://github.com/${ensRecords["com.github"]}`}
                />
              )}
              {ensRecords && ensRecords["com.instagram"] && (
                <Action.OpenInBrowser
                  title="Open on Instagram"
                  icon="instagram.png"
                  url={`https://instagram.com/${ensRecords["com.instagram"]}`}
                />
              )}
              {ensRecords && ensRecords["com.twitter"] && (
                <Action.OpenInBrowser
                  title="Open on Twitter"
                  icon="twitter.png"
                  url={`https://twitter.com/${ensRecords["com.twitter"]}`}
                />
              )}
              <Action.CopyToClipboard title="Copy Address" content={String(ensAddress)} />
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
                  {ensRecords?.description && (
                    <List.Item.Detail.Metadata.Label title="Description" text={ensRecords.description} />
                  )}
                  {ensRecords?.pronouns && (
                    <List.Item.Detail.Metadata.Label title="Pronouns" text={ensRecords.pronouns} />
                  )}
                  {ensRecords?.keywords && (
                    <List.Item.Detail.Metadata.TagList title="Keywords">
                      {ensRecords.keywords.split(",").map((keyword) => (
                        <List.Item.Detail.Metadata.TagList.Item key={keyword} text={keyword.trim()} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {ensRecords?.url && (
                    <List.Item.Detail.Metadata.Link title="URL" text={ensRecords.url} target={ensRecords.url} />
                  )}
                  {ensRecords?.website && (
                    <List.Item.Detail.Metadata.Link
                      title="Website"
                      text={ensRecords.website}
                      target={ensRecords.website}
                    />
                  )}
                  {ensRecords && ensRecords["email"] && (
                    <List.Item.Detail.Metadata.Label title="Email" text={ensRecords["email"]} />
                  )}
                  {ensRecords && ensRecords["com.github"] && (
                    <List.Item.Detail.Metadata.Link
                      title="GitHub"
                      text={ensRecords["com.github"]}
                      target={ensRecords["com.github"]}
                    />
                  )}
                  {ensRecords && ensRecords["com.instagram"] && (
                    <List.Item.Detail.Metadata.Link
                      title="Instagram"
                      text={ensRecords["com.instagram"]}
                      target={ensRecords["com.instagram"]}
                    />
                  )}
                  {ensRecords && ensRecords["com.twitter"] && (
                    <List.Item.Detail.Metadata.Link
                      title="Twitter"
                      text={`@${ensRecords["com.twitter"]}`}
                      target={ensRecords["com.twitter"]}
                    />
                  )}
                  {ensRecords && ensRecords["com.discord"] && (
                    <List.Item.Detail.Metadata.Link
                      title="Discord"
                      text={ensRecords["com.discord"]}
                      target={ensRecords["com.discord"]}
                    />
                  )}
                  {ensRecords && ensRecords["org.telegram"] && (
                    <List.Item.Detail.Metadata.Link
                      title="Telegram"
                      text={ensRecords["org.telegram"]}
                      target={ensRecords["org.telegram"]}
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
              <Action.CopyToClipboard title="Copy Address" content={String(ensAddress)} />
              <Action.OpenInBrowser
                title="Open on Etherscan"
                icon={{ source: { light: "etherscan.png", dark: "etherscan-dark.png" } }}
                url={`https://etherscan.io/address/${ensAddress}`}
              />
              <Action.OpenInBrowser
                title="Open on Rainbow Web"
                icon={{ source: "rainbow.png" }}
                url={`https://rainbow.me/${name}`}
              />
              <Action.OpenInBrowser
                title="Open on OpenSea"
                icon="opensea.png"
                url={`https://opensea.io/${ensAddress}`}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Address" text={String(ensAddress)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Etherscan"
                    text="Etherscan"
                    target={`https://etherscan.io/address/${ensAddress}`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Balance"
                    text={`${Number(balance?.formatted).toFixed(2)} ETH`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
    </List>
  );
}
