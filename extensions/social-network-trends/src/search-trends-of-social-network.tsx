import { List } from "@raycast/api";
import { douyinSearchUrl, TrendsTags, trendsTags } from "./utils/trend-utils";
import { commonPreferences, listIcon, listIconDark } from "./utils/common-utils";
import { getTrends } from "./hooks/hooks";
import { TrendActions } from "./utils/ui-component";
import { useState } from "react";

export default function TrendOfWeibo() {
  const { rememberTag } = commonPreferences();
  const [trendsTag, setTrendsTag] = useState<string>(TrendsTags.ALL);
  const { weiBoTrends, zhiHuTrends, douYinTrends } = getTrends();

  return (
    <List
      isLoading={weiBoTrends.length === 0 && zhiHuTrends.length === 0 && douYinTrends.length === 0}
      searchBarPlaceholder={"Search trends"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Collection Tag"
          storeValue={rememberTag}
          onChange={(newValue) => {
            setTrendsTag(newValue);
          }}
        >
          {trendsTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.WEIBO) && (
        <List.Section title={"WeiBo"}>
          {weiBoTrends?.map((value, index) => {
            return (
              <List.Item
                id={index + value.url}
                key={index + value.url}
                icon={{ source: { light: `${listIcon[index]}`, dark: `${listIconDark[index]}` } }}
                title={value.name}
                accessories={[{ text: `${(value.hot / 10000).toFixed(1)}w` }]}
                actions={<TrendActions url={value.url} name={value.name} />}
              />
            );
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.ZHIHU) && (
        <List.Section title={"ZhiHU"}>
          {zhiHuTrends?.map((value, index) => {
            return (
              <List.Item
                id={index + value.url}
                key={index + value.url}
                icon={{ source: { light: `${listIcon[index]}`, dark: `${listIconDark[index]}` } }}
                title={value.query}
                accessories={[{ text: `${value.name}` }]}
                actions={<TrendActions url={value.url} name={value.name} />}
              />
            );
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.DOUYIN) && (
        <List.Section title={"DouYin"}>
          {douYinTrends?.map((value, index) => {
            return (
              <List.Item
                id={index + value.name}
                key={index + value.name}
                icon={{ source: { light: `${listIcon[index]}`, dark: `${listIconDark[index]}` } }}
                title={value.name}
                accessories={[{ text: `${(value.hot / 10000).toFixed(1)}w` }]}
                actions={<TrendActions url={douyinSearchUrl + encodeURIComponent(value.name)} name={value.name} />}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
