const BASE_URL = "https://tenapi.cn/v2";
export const WEIBO_TENAPI = BASE_URL + "/weibohot";
export const ZHIHU_TENAPI = BASE_URL + "/zhihuhot";
export const DOUYIN_TENAPI = BASE_URL + "/douyinhot";
export const BAIDU_TENAPI = BASE_URL + "/baiduhot";
export const TOUTIAO_TENAPI = BASE_URL + "/toutiaohot";
export const BILI_TENAPI = BASE_URL + "/bilihot";
export const TOUTIAO_NEWS_TENAPI = BASE_URL + "/toutiaohotnew";

export const douyinSearchUrl = "https://www.douyin.com/search/";

export enum TrendsTags {
  ALL = "All",
  WEIBO = "WeiBo",
  ZHIHU = "ZhiHu",
  DOUYIN = "DouYin",
  BAIDU = "BaiDu",
  TOUTIAO = "TouTiao",
  TOUTIAONEWS = "TouTiao News",
  BILI = "BiliBili",
}

export const trendsTags = [
  { title: TrendsTags.ALL, value: TrendsTags.ALL },
  { title: TrendsTags.WEIBO, value: TrendsTags.WEIBO },
  { title: TrendsTags.ZHIHU, value: TrendsTags.ZHIHU },
  { title: TrendsTags.DOUYIN, value: TrendsTags.DOUYIN },
  { title: TrendsTags.BAIDU, value: TrendsTags.BAIDU },
  { title: TrendsTags.TOUTIAO, value: TrendsTags.TOUTIAO },
  { title: TrendsTags.TOUTIAONEWS, value: TrendsTags.TOUTIAONEWS },
  { title: TrendsTags.BILI, value: TrendsTags.BILI },
];

export enum CacheKey {
  WEI_BO = "WeiBoHot",
  ZHI_HU = "ZhiHuHot",
  DOU_YIN = "DouYinHot",
  BAI_DU = "BaiDuHot",
  TOU_TIAO = "TouTiaoHot",
  TOU_TIAO_NEWS = "TouTiaoNews",
  BILI = "BiliHot",

  REFRESH_TIME = "Last refresh time",
}
