import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ApiKeyForm } from "./components/api-key-form";
import { TrendListItem } from "./components/trend-list-item";
import { TrendsEmptyView } from "./components/trends-empty-view";
import { useBaidu } from "./hooks/useBaidu";
import { useBili } from "./hooks/useBili";
import { useDouyin } from "./hooks/useDouyin";
import { usePengpai } from "./hooks/usePengpai";
import { useToutiao } from "./hooks/useToutiao";
import { useWeibo } from "./hooks/useWeibo";
import { useWeixin } from "./hooks/useWeixin";
import { useZhihu } from "./hooks/useZhihu";
import {
  rememberTag,
  showBaiDu,
  showBiliBili,
  showDouYin,
  showPengpai,
  showTouTiao,
  showWeibo,
  showWeixin,
  showZhiHu,
  tophubApiKey,
} from "./types/preferences";
import { spliceTrends } from "./utils/common-utils";
import { TrendsTags } from "./utils/constants";

export default function SearchTrendsOfSocialNetwork() {
  // All state hooks must be called unconditionally at the top of the component
  const [apiKeySubmitted, setApiKeySubmitted] = useState<boolean>(!!tophubApiKey);
  const [trendsTag, setTrendsTag] = useState<string>(TrendsTags.ALL);

  // All data hooks must be called unconditionally, even if we may not use their results
  const { data: baiduData, isLoading: baiduLoading } = useBaidu();
  const { data: biliData, isLoading: biliLoading } = useBili();
  const { data: douyinData, isLoading: douyinLoading } = useDouyin();
  const { data: toutiaoData, isLoading: toutiaoLoading } = useToutiao();
  const { data: weiboData, isLoading: weiboLoading } = useWeibo();
  const { data: zhihuData, isLoading: zhihuLoading } = useZhihu();
  const { data: weixinData, isLoading: weixinLoading } = useWeixin();
  const { data: pengpaiData, isLoading: pengpaiLoading } = usePengpai();

  const isLoading = useMemo(() => {
    return (
      baiduLoading ||
      biliLoading ||
      douyinLoading ||
      toutiaoLoading ||
      weiboLoading ||
      zhihuLoading ||
      weixinLoading ||
      pengpaiLoading
    );
  }, [
    baiduLoading,
    biliLoading,
    douyinLoading,
    toutiaoLoading,
    weiboLoading,
    zhihuLoading,
    weixinLoading,
    pengpaiLoading,
  ]);

  const socialTrends = useMemo(() => {
    const socialTrends_ = [];

    if (weiboData && (trendsTag === TrendsTags.WEIBO || trendsTag === TrendsTags.ALL) && showWeibo) {
      socialTrends_.push({ title: TrendsTags.WEIBO, data: spliceTrends(weiboData) });
    }
    if (zhihuData && (trendsTag === TrendsTags.ZHIHU || trendsTag === TrendsTags.ALL) && showZhiHu) {
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
    if (weixinData && (trendsTag === TrendsTags.WEIXIN || trendsTag === TrendsTags.ALL) && showWeixin) {
      socialTrends_.push({ title: TrendsTags.WEIXIN, data: spliceTrends(weixinData) });
    }
    if (pengpaiData && (trendsTag === TrendsTags.PENGPAI || trendsTag === TrendsTags.ALL) && showPengpai) {
      socialTrends_.push({ title: TrendsTags.PENGPAI, data: spliceTrends(pengpaiData) });
    }
    return socialTrends_;
  }, [trendsTag, baiduData, biliData, douyinData, toutiaoData, weiboData, zhihuData, weixinData, pengpaiData]);

  const socialTags = useMemo(() => {
    const socialTags_ = [];
    socialTags_.push({ title: TrendsTags.ALL, value: TrendsTags.ALL });

    // No longer checks if the data exists, only checks if the platform is enabled
    if (showWeibo) {
      socialTags_.push({ title: TrendsTags.WEIBO, value: TrendsTags.WEIBO });
    }
    if (showZhiHu) {
      socialTags_.push({ title: TrendsTags.ZHIHU, value: TrendsTags.ZHIHU });
    }
    if (showDouYin) {
      socialTags_.push({ title: TrendsTags.DOUYIN, value: TrendsTags.DOUYIN });
    }
    if (showBaiDu) {
      socialTags_.push({ title: TrendsTags.BAIDU, value: TrendsTags.BAIDU });
    }
    if (showTouTiao) {
      socialTags_.push({ title: TrendsTags.TOUTIAO, value: TrendsTags.TOUTIAO });
    }
    if (showBiliBili) {
      socialTags_.push({ title: TrendsTags.BILI, value: TrendsTags.BILI });
    }
    if (showWeixin) {
      socialTags_.push({ title: TrendsTags.WEIXIN, value: TrendsTags.WEIXIN });
    }
    if (showPengpai) {
      socialTags_.push({ title: TrendsTags.PENGPAI, value: TrendsTags.PENGPAI });
    }

    return socialTags_;
  }, []); // No longer checks if the data exists, only checks if the platform is enabled

  // If there is no API Key, display the API Key input form
  if (!apiKeySubmitted) {
    return <ApiKeyForm onApiKeySaved={() => setApiKeySubmitted(true)} />;
  }

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
