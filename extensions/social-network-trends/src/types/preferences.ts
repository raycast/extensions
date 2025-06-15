import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  rememberTag: boolean;
  trendsNumber: string;
  showTrendsTitle: boolean;
  showWeibo: boolean;
  showBaiDu: boolean;
  showZhiHu: boolean;
  showDouYin: boolean;
  showBiliBili: boolean;
  showTouTiao: boolean;
}

export const {
  rememberTag,
  trendsNumber,
  showTrendsTitle,
  showWeibo,
  showBaiDu,
  showZhiHu,
  showDouYin,
  showBiliBili,
  showTouTiao,
} = getPreferenceValues<Preferences>();
