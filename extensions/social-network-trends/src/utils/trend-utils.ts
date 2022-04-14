export const weiboTrendApi = "https://tenapi.cn/resou/";
export const zhihuTrendApi = "https://tenapi.cn/zhihuresou/";
export const douyinTrendApi = "https://tenapi.cn/douyinresou/";

export const douyinUrl = "https://www.douyin.com";

export type ResponseDataWeiBo = { data: number; list: TrendWeiBo[] };
export type TrendWeiBo = { name: string; hot: number; url: string };

export type ResponseDataZhiHu = { data: number; list: TrendZhiHu[] };
export type TrendZhiHu = { name: string; query: string; url: string };

export type ResponseDataDouYin = { data: number; list: TrendDouYin[] };
export type TrendDouYin = { name: string; hot: number };
