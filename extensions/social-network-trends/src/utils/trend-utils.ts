export const weiboTrendApi = "https://tenapi.cn/resou/";
export const zhihuTrendApi = "https://tenapi.cn/zhihuresou/";
export const douyinTrendApi = "https://tenapi.cn/douyinresou/";

export const weiboSearchUrl = "https://s.weibo.com/weibo?q=";
export const zhihuSearchUrl = "https://www.zhihu.com/search?type=content&q=";
export const douyinSearchUrl = "https://www.douyin.com/search/";

export type ResponseDataWeiBo = { data: number; list: TrendWeiBo[] };
export type TrendWeiBo = { name: string; hot: number; url: string };

export type ResponseDataZhiHu = { data: number; list: TrendZhiHu[] };
export type TrendZhiHu = { name: string; query: string; url: string };

export type ResponseDataDouYin = { data: number; list: TrendDouYin[] };
export type TrendDouYin = { name: string; hot: number };
