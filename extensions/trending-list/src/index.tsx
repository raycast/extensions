import { useMemo, useState } from "react";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import SiteDropdown from "./components/SiteDorpdown";

import { getIcon, formatNumber, getBody } from "./utils";

import { TrendingItem, SiteConfig, SiteItem } from "./type";

export default function Command() {
  const [currentSite, setCurrentSite] = useState("zhihu");
  const currentBody = useMemo(() => getBody(currentSite), [currentSite]);

  const { data: siteList = [] } = useFetch<SiteItem[]>("https://www.suredian.com/res/getsource", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data: SiteConfig = await response.json();

      if (!data) {
        return [];
      }

      const sitePriorityMap: Record<string, number> = {
        zhihu: 1,
        baidu: 2,
        weibo: 3,
        bilibili: 4,
      };

      const siteList = Object.values(data);

      return siteList.sort((a, b) => {
        const aPriority = sitePriorityMap[a.key] || Infinity;
        const bPriority = sitePriorityMap[b.key] || Infinity;
        return aPriority - bPriority;
      });
    },
  });

  const { data = [], isLoading } = useFetch<TrendingItem[]>("https://www.suredian.com/res/get", {
    method: "POST",
    body: currentBody,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
  });

  const getAccessories = (item: TrendingItem) => {
    const hot =
      Number(item.hotvalue) > 0 ? { text: `${formatNumber(Number(item.hotvalue))}`, icon: Icon.Temperature } : null;
    return [hot].filter(Boolean) as [NonNullable<typeof hot>];
  };

  return (
    <List isLoading={isLoading} searchBarAccessory={<SiteDropdown siteList={siteList} onSiteChange={setCurrentSite} />}>
      {data?.map((item, index) => (
        <List.Item
          key={item.id}
          icon={getIcon(index + 1)}
          title={item.title || item.excerpt || ""}
          accessories={getAccessories(item)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={encodeURI(item.url)} />
              <Action.CopyToClipboard content={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
