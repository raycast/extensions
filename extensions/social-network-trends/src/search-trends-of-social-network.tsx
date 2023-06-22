import { List } from "@raycast/api";
import { TrendsTags, trendsTags } from "./utils/constants";
import { getAllTrends } from "./hooks/hooks";
import { useState } from "react";
import { rememberTag } from "./types/preferences";
import { TrendListItem } from "./components/trend-list-item";
import { TrendsEmptyView } from "./components/trends-empty-view";

export default function SearchTrendsOfSocialNetwork() {
  const [trendsTag, setTrendsTag] = useState<string>(TrendsTags.ALL);
  const { weiBoTrends, zhiHuTrends, douYinTrends, baiduTrend, toutiaoTrend, toutiaoNewsTrend, biliTrend, loading } =
    getAllTrends(50);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search trends`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Trends Tag"
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
      <TrendsEmptyView />

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.WEIBO) && (
        <List.Section title={TrendsTags.WEIBO}>
          {weiBoTrends?.map((value, index) => {
            return <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.WEIBO]} />;
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.ZHIHU) && (
        <List.Section title={TrendsTags.ZHIHU}>
          {zhiHuTrends?.map((value, index) => {
            return <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.ZHIHU]} />;
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.DOUYIN) && (
        <List.Section title={TrendsTags.DOUYIN}>
          {douYinTrends?.map((value, index) => {
            return (
              <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.DOUYIN]} />
            );
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.BAIDU) && (
        <List.Section title={"BaiDu"}>
          {baiduTrend?.map((value, index) => {
            return <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.BAIDU]} />;
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.TOUTIAO) && (
        <List.Section title={TrendsTags.TOUTIAO}>
          {toutiaoTrend?.map((value, index) => {
            return (
              <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.TOUTIAO]} />
            );
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.TOUTIAONEWS) && (
        <List.Section title={TrendsTags.TOUTIAONEWS}>
          {toutiaoNewsTrend?.map((value, index) => {
            return (
              <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.TOUTIAONEWS]} />
            );
          })}
        </List.Section>
      )}

      {(trendsTag === TrendsTags.ALL || trendsTag === TrendsTags.BILI) && (
        <List.Section title={TrendsTags.BILI}>
          {biliTrend?.map((value, index) => {
            return <TrendListItem key={index + value.name} index={index} trend={value} keywords={[TrendsTags.BILI]} />;
          })}
        </List.Section>
      )}
    </List>
  );
}
