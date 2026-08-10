import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { TrendMenubarItem } from "./components/trend-menubar-item";
import { useBaidu } from "./hooks/useBaidu";
import { useBili } from "./hooks/useBili";
import { useDouyin } from "./hooks/useDouyin";
import { useToutiao } from "./hooks/useToutiao";
import { useWeibo } from "./hooks/useWeibo";
import { useZhihu } from "./hooks/useZhihu";
import { useMemo } from "react";
import { TrendsTags } from "./utils/constants";
import { showBaiDu, showBiliBili, showDouYin, showTouTiao, showWeibo, showZhiHu } from "./types/preferences";
import { getMenubarTitle, spliceTrends } from "./utils/common-utils";
import { SocialTrend } from "./types/types";

export default function SearchTrendsOfSocialNetworkMenuBar() {
  const { data: baiduData, isLoading: baiduLoading } = useBaidu();
  const { data: biliData, isLoading: biliLoading } = useBili();
  const { data: douyinData, isLoading: douyinLoading } = useDouyin();
  const { data: toutiaoData, isLoading: toutiaoLoading } = useToutiao();
  const { data: weiboData, isLoading: weiboLoading } = useWeibo();
  const { data: zhihuData, isLoading: zhihuLoading } = useZhihu();

  const isLoading = useMemo(() => {
    return baiduLoading || biliLoading || douyinLoading || toutiaoLoading || weiboLoading || zhihuLoading;
  }, [baiduLoading, biliLoading, douyinLoading, toutiaoLoading, weiboLoading, zhihuLoading]);

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
    return socialTrends_;
  }, [baiduData, biliData, douyinData, toutiaoData, weiboData, zhihuData]);

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
            await openCommandPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
