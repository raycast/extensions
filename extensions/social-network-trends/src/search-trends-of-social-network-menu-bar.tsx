import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useMemo, useState } from "react";
import { ApiKeyForm } from "./components/api-key-form";
import { TrendMenubarItem } from "./components/trend-menubar-item";
import { useBaidu } from "./hooks/useBaidu";
import { useBili } from "./hooks/useBili";
import { useDouyin } from "./hooks/useDouyin";
import { usePengpai } from "./hooks/usePengpai";
import { useToutiao } from "./hooks/useToutiao";
import { useWeibo } from "./hooks/useWeibo";
import { useWeixin } from "./hooks/useWeixin";
import { useZhihu } from "./hooks/useZhihu";
import {
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
import { SocialTrend } from "./types/types";
import { getMenubarTitle, spliceTrends } from "./utils/common-utils";
import { TrendsTags } from "./utils/constants";

export default function SearchTrendsOfSocialNetworkMenuBar() {
  // All state hooks must be called unconditionally at the top of the component
  const [apiKeySubmitted, setApiKeySubmitted] = useState<boolean>(!!tophubApiKey);

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
    const socialTrends_: SocialTrend[] = [];
    const num = 10;
    if (weiboData && showWeibo) {
      socialTrends_.push({ title: TrendsTags.WEIBO, data: spliceTrends(weiboData, num) });
    }
    if (zhihuData && showZhiHu) {
      socialTrends_.push({ title: TrendsTags.ZHIHU, data: spliceTrends(zhihuData, num) });
    }
    if (douyinData && showDouYin) {
      socialTrends_.push({ title: TrendsTags.DOUYIN, data: spliceTrends(douyinData, num) });
    }
    if (baiduData && showBaiDu) {
      socialTrends_.push({ title: TrendsTags.BAIDU, data: spliceTrends(baiduData, num) });
    }
    if (toutiaoData && showTouTiao) {
      socialTrends_.push({ title: TrendsTags.TOUTIAO, data: spliceTrends(toutiaoData, num) });
    }
    if (biliData && showBiliBili) {
      socialTrends_.push({ title: TrendsTags.BILI, data: spliceTrends(biliData, num) });
    }
    if (weixinData && showWeixin) {
      socialTrends_.push({ title: TrendsTags.WEIXIN, data: spliceTrends(weixinData, num) });
    }
    if (pengpaiData && showPengpai) {
      socialTrends_.push({ title: TrendsTags.PENGPAI, data: spliceTrends(pengpaiData, num) });
    }
    return socialTrends_;
  }, [baiduData, biliData, douyinData, toutiaoData, weiboData, zhihuData, weixinData, pengpaiData]);

  // If there is no API Key, display the API Key input form
  if (!apiKeySubmitted) {
    return <ApiKeyForm onApiKeySaved={() => setApiKeySubmitted(true)} />;
  }

  return (
    <MenuBarExtra isLoading={isLoading} title={getMenubarTitle(socialTrends)} icon={Icon.Hashtag}>
      {socialTrends.map((value, index) => {
        return (
          <MenuBarExtra.Section title={value.title} key={value.title + index}>
            {value.data?.map((trend, index) => {
              return <TrendMenubarItem key={index + trend.name} trend={trend} index={index} />;
            })}
          </MenuBarExtra.Section>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title={"Settings..."}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={async () => {
            await openExtensionPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
