// 今日热榜 API 基础 URL
export const TOPHUB_API_BASE = "https://api.tophubdata.com";

// 各平台的 hashid
export const WEIBO_HASHID = "KqndgxeLl9"; // 微博热搜榜
export const ZHIHU_HASHID = "mproPpoq6O"; // 知乎热榜
export const DOUYIN_HASHID = "DpQvNABoNE"; // 抖音热点榜
export const BAIDU_HASHID = "Jb0vmloB1G"; // 百度热搜榜
export const TOUTIAO_HASHID = "74KvxwokxM"; // 今日头条热榜
export const BILI_HASHID = "74KvxwokxM"; // 哔哩哔哩热榜
export const WEIXIN_HASHID = "WnBe01o371"; // 微信热榜
export const PENGPAI_HASHID = "wWmoO5Rd4E"; // 澎湃热榜

export enum TrendsTags {
  ALL = "All",
  WEIBO = "WeiBo",
  ZHIHU = "ZhiHu",
  DOUYIN = "DouYin",
  BAIDU = "BaiDu",
  TOUTIAO = "TouTiao",
  BILI = "BiliBili",
  WEIXIN = "WeChat",
  PENGPAI = "PengPai",
}
