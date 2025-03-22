import { getFavicon, useCachedPromise } from "@raycast/utils";
import { envato } from "./utils";
import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MarketDomain } from "envato";
import { MARKET_DOMAINS } from "./constants";
import { ItemDetail } from "./itemDetail";

export default function SearchItems() {
  const [filter, setFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, pagination } = useCachedPromise(
    (term: string, site: string) => async (options) => {
      const res = await envato.catalog.searchItems({
        term,
        site: site === "" ? undefined : (site as MarketDomain),
        page: options.page + 1,
      });
      return {
        data: res.matches,
        hasMore: !!res.links.next_page_url,
      };
    },
    [searchText, filter],
    {
      initialData: [],
    }
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Site" storeValue onChange={setFilter}>
          <List.Dropdown.Item icon="icon.png" title="All" value="" />
          {MARKET_DOMAINS.map((domain) => (
            <List.Dropdown.Item key={domain} icon={getFavicon(`https://${domain}`)} title={domain} value={domain} />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {data.map((item) => (
        <List.Item
          key={item.id}
          icon={
            item.previews.icon_with_square_preview?.icon_url ??
            item.previews.icon_with_landscape_preview?.icon_url ??
            Icon.Dot
          }
          title={item.name}
          detail={<ItemDetail item={item} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon="icon.png" url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
