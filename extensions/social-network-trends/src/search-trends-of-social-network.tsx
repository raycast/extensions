import { List } from "@raycast/api";
import { TrendsTags } from "./utils/constants";
import { useMemo, useState } from "react";
import {
  rememberTag,
  showBaiDu,
  showBiliBili,
  showDouYin,
  showTouTiao,
  showWeibo,
  showZhiHu,
} from "./types/preferences";
import { TrendListItem } from "./components/trend-list-item";
import { TrendsEmptyView } from "./components/trends-empty-view";
import { useBaidu } from "./hooks/useBaidu";
import { useBili } from "./hooks/useBili";
import { useDouyin } from "./hooks/useDouyin";
import { useToutiao } from "./hooks/useToutiao";
import { useWeibo } from "./hooks/useWeibo";
import { useZhihu } from "./hooks/useZhihu";
import { spliceTrends } from "./utils/common-utils";

export default function SearchTrendsOfSocialNetwork() {
  const { data: baiduData, isLoading: baiduLoading } = useBaidu();
  const { data: biliData, isLoading: biliLoading } = useBili();
  const { data: douyinData, isLoading: douyinLoading } = useDouyin();
  const { data: toutiaoData, isLoading: toutiaoLoading } = useToutiao();
  const { data: weiboData, isLoading: weiboLoading } = useWeibo();
  const { data: zhihuData, isLoading: zhihuLoading } = useZhihu();
  const [trendsTag, setTrendsTag] = useState<string>(TrendsTags.ALL);

  const isLoading = useMemo(() => {
    return baiduLoading || biliLoading || douyinLoading || toutiaoLoading || weiboLoading || zhihuLoading;
  }, [baiduLoading, biliLoading, douyinLoading, toutiaoLoading, weiboLoading, zhihuLoading]);

  const socialTrends = useMemo(() => {
    const socialTrends_ = [];

    if (weiboData && (trendsTag === TrendsTags.WEIBO || trendsTag === TrendsTags.ALL) && showWeibo) {
      socialTrends_.push({ title: TrendsTags.WEIBO, data: spliceTrends(weiboData) });
    }
    if (zhihuData && (trendsTag === TrendsTags.ZHIHU || trendsTag === TrendsTags.ALL) && zhihuData) {
      socialTrends_.push({ title: TrendsTags.ZHIHU, data: spliceTrends(zhihuData) });
    }
    if (douyinData && (trendsTag === TrendsTags.DOUYIN || trendsTag === TrendsTags.ALL) && showDouYin) {
      socialTrends_.push({ title: TrendsTags.DOUYIN, data: spliceTrends(douyinData) });
    }
    if (baiduData && (trendsTag === TrendsTags.BAIDU || trendsTag === TrendsTags.ALL) && showBaiDu) {
      socialTrends_.push({ title: TrendsTags.BAIDU, data: spliceTrends(baiduData) });
    }
    if (toutiaoData && (trendsTag === TrendsTags.TOUTIAO || trendsTag === TrendsTags.ALL) && showTouTiao) {
      socialTrends_.push({ title: TrendsTags.TOUTIAO, data: spliceTrends(toutiaoData) });
    }
    if (biliData && (trendsTag === TrendsTags.BILI || trendsTag === TrendsTags.ALL) && showBiliBili) {
      socialTrends_.push({ title: TrendsTags.BILI, data: spliceTrends(biliData) });
    }
    return socialTrends_;
  }, [trendsTag, baiduData, biliData, douyinData, toutiaoData, weiboData, zhihuData]);

  const socialTags = useMemo(() => {
    const socialTags_ = [];
    socialTags_.push({ title: TrendsTags.ALL, value: TrendsTags.ALL });
    if (weiboData && showWeibo) {
      socialTags_.push({ title: TrendsTags.WEIBO, value: TrendsTags.WEIBO });
    }
    if (zhihuData && showZhiHu) {
      socialTags_.push({ title: TrendsTags.ZHIHU, value: TrendsTags.ZHIHU });
    }
    if (douyinData && showDouYin) {
      socialTags_.push({ title: TrendsTags.DOUYIN, value: TrendsTags.DOUYIN });
    }
    if (baiduData && showBaiDu) {
      socialTags_.push({ title: TrendsTags.BAIDU, value: TrendsTags.BAIDU });
    }
    if (toutiaoData && showTouTiao) {
      socialTags_.push({ title: TrendsTags.TOUTIAO, value: TrendsTags.TOUTIAO });
    }
    if (biliData && showBiliBili) {
      socialTags_.push({ title: TrendsTags.BILI, value: TrendsTags.BILI });
    }

    return socialTags_;
  }, [trendsTag, baiduData, biliData, douyinData, toutiaoData, weiboData, zhihuData]);

  return (
    <List
      searchBarPlaceholder={`Search trends`}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Trends Tag"
          storeValue={rememberTag}
          onChange={(newValue) => {
            setTrendsTag(newValue);
          }}
        >
          {socialTags.map((value) => {
            return <List.Dropdown.Item key={value.title} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <TrendsEmptyView />
      {socialTrends.map((socialTrend) => {
        return (
          <List.Section key={socialTrend.title} title={socialTrend.title}>
            {socialTrend.data?.map((value, index) => {
              return (
                <TrendListItem key={index + value.name} index={index} trend={value} keywords={[socialTrend.title]} />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
