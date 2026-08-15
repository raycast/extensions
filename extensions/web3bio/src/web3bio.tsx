import { Action, ActionPanel, Cache, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { Platform, ProfileResponse } from "web3bio-profile-kit/types";
import { detectPlatform, getPlatform } from "web3bio-profile-kit/utils";

const PROD_API_ENDPOINT = "https://api.web3.bio";

const cache = new Cache();

export default function Command() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showingDetail, setShowingDetail] = useState(false);
  const [url, setUrl] = useState(PROD_API_ENDPOINT);
  const platform = detectPlatform(searchTerm);
  const [filter, setFilter] = useState("All");

  const { isLoading, data } = useFetch(url, {
    parseResponse: async (res) => {
      try {
        const rr = await res.json();
        if (rr.error) return [];
        return rr;
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (searchTerm && platform && !cache.get(searchTerm)) {
      setUrl(PROD_API_ENDPOINT + `/profile/${searchTerm.toLowerCase()}`);
    }
    if (data?.length > 0 && !cache.get(searchTerm)) {
      cache.set(searchTerm, JSON.stringify(data));
    }
  }, [searchTerm, data, cache]);

  const profiles = useCallback(() => {
    const cached = cache.get(searchTerm);
    if (searchTerm && cached && JSON.parse(cached).length > 0 && cached.includes(searchTerm)) {
      return JSON.parse(cache.get(searchTerm)!);
    }
    return data || [];
  }, [searchTerm, data, cache, platform])();

  function PlatformFilter({ platforms, onSelectChange }: { platforms: string[]; onSelectChange: (v: string) => void }) {
    const _set = new Set(platforms);
    return (
      platforms?.length > 0 && (
        <List.Dropdown
          tooltip="Select Platform Filter"
          storeValue={false}
          onChange={(newVal) => onSelectChange(newVal)}
        >
          <List.Dropdown.Section title="Platform Filter">
            <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
            {[..._set].map((x: string) => {
              return <List.Dropdown.Item key={x} title={getPlatform(x as Platform).label} value={x} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      )
    );
  }

  function EmptyView() {
    const emptyIcon = !searchTerm ? "🔍" : isLoading ? "🚀" : !profiles?.length ? "🤖" : "";
    const emptyTitle = !searchTerm
      ? "Web3 Identity Search"
      : isLoading
        ? "Searching..."
        : !profiles?.length
          ? "No results found"
          : "";
    const emptyDescription = !searchTerm
      ? "Search Ethereum, ENS, Lens, Farcaster..."
      : isLoading
        ? "Please wait a second."
        : !profiles?.length
          ? "Please try different identity."
          : "";
    return <List.EmptyView title={emptyTitle} icon={emptyIcon} description={emptyDescription} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Ethereum, ENS, Lens, Farcaster..."
      onSearchTextChange={(text) => {
        setSearchTerm(text);
        setShowingDetail(false);
      }}
      throttle
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <PlatformFilter
          platforms={(!profiles?.length || profiles.error ? [] : profiles)?.map((x: ProfileResponse) => x.platform)}
          onSelectChange={setFilter}
        />
      }
    >
      <EmptyView />

      <List.Section title="Profiles">
        {profiles
          ?.filter((x: ProfileResponse) => {
            if (filter === "All") return x;
            return x.platform === filter;
          })
          ?.map((item: ProfileResponse) => {
            const relatedPath = `${item.identity}${item.platform === Platform.farcaster ? ".farcaster" : ""}`;
            const props: Partial<List.Item.Props> = showingDetail
              ? {
                  detail: (
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          {item.displayName === item.identity ? (
                            <List.Item.Detail.Metadata.Label
                              title="Profile"
                              text={item.displayName}
                              icon={{
                                source:
                                  item.avatar || `${PROD_API_ENDPOINT}/avatar/svg/${item.platform},${item.identity}`,
                                mask: Image.Mask.Circle,
                              }}
                            />
                          ) : (
                            <>
                              <List.Item.Detail.Metadata.Label
                                title="Profile"
                                text={item.displayName || ""}
                                icon={{
                                  source:
                                    item.avatar || `${PROD_API_ENDPOINT}/avatar/svg/${item.platform},${item.identity}`,
                                  mask: Image.Mask.Circle,
                                }}
                              />
                              <List.Item.Detail.Metadata.Label title="" text={item.identity} />
                            </>
                          )}
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Address" text={item.address || ""} />
                          <List.Item.Detail.Metadata.Label
                            title="Platform"
                            text={getPlatform(item.platform as Platform).label}
                            icon={getPlatform(item.platform as Platform).icon}
                          />
                          {item.description && <List.Item.Detail.Metadata.Label title="Bio" text={item.description} />}
                          {item.email && <List.Item.Detail.Metadata.Label title="Email" text={item.email} />}
                          {item.location && <List.Item.Detail.Metadata.Label title="Location" text={item.location} />}

                          {Object.keys(item.links)?.length > 0 && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="🌐 Social links" />
                              {Object.keys(item.links).map((key) => {
                                const x = item.links[key as Platform];
                                return (
                                  x.handle && (
                                    <List.Item.Detail.Metadata.Link
                                      key={`${key}_${x.handle}`}
                                      text={x.handle}
                                      title={getPlatform(key as Platform).label}
                                      target={x.link || ""}
                                    />
                                  )
                                );
                              })}
                            </>
                          )}
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link
                            title=""
                            text="More on Web3.bio"
                            target={`https://web3.bio/${relatedPath}`}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ),
                }
              : {};
            return (
              <List.Item
                key={item.identity + item.platform}
                title={item.displayName || item.identity}
                subtitle={item.displayName && item.displayName === item.identity ? item.address || "" : item.identity}
                icon={{
                  source: item.avatar || `${PROD_API_ENDPOINT}/avatar/svg/${item.platform},${item.identity}`,
                  mask: Image.Mask.Circle,
                }}
                accessories={[
                  {
                    icon: getPlatform(item.platform as Platform).icon,
                  },
                ]}
                {...props}
                actions={
                  <ActionPanel>
                    <Action
                      title="Toggle Detail"
                      icon={Icon.AppWindowSidebarLeft}
                      onAction={() => setShowingDetail(!showingDetail)}
                    />
                    <Action.OpenInBrowser title="Open in Web3.bio Profile" url={`https://web3.bio/${relatedPath}`} />
                    <Action.CopyToClipboard title="Copy Address" content={String(item.address)} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
