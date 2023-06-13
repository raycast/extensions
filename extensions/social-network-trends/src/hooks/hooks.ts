import { useCallback, useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import {
  BAIDU_TENAPI,
  BILI_TENAPI,
  CacheKey,
  DOUYIN_TENAPI,
  TOUTIAO_NEWS_TENAPI,
  TOUTIAO_TENAPI,
  WEIBO_TENAPI,
  ZHIHU_TENAPI,
} from "../utils/constants";
import { Cache } from "@raycast/api";
import { TenHotRes, Trend } from "../types/types";

export const getAllTrends = (itemCount: number) => {
  const [weiboTrend, setWeiboTrend] = useState<Trend[]>([]);
  const [douyinTrend, setDouyinTrend] = useState<Trend[]>([]);
  const [zhihuTrend, setZhihuTrend] = useState<Trend[]>([]);
  const [baiduTrend, setBaiduTrend] = useState<Trend[]>([]);
  const [toutiaoTrend, setToutiaoTrend] = useState<Trend[]>([]);
  const [toutiaoNewsTrend, setToutiaoNewsTrend] = useState<Trend[]>([]);
  const [biliTrend, setBiliTrend] = useState<Trend[]>([]);

  const [weiboLoading, setWeiboLoading] = useState<boolean>(true);
  const [douyinLoading, setDouyinLoading] = useState<boolean>(true);
  const [zhihuLoading, setZhihuLoading] = useState<boolean>(true);
  const [baiduLoading, setBaiduLoading] = useState<boolean>(true);
  const [toutiaoLoading, setToutiaoLoading] = useState<boolean>(true);
  const [toutiaoNewsLoading, setToutiaoNewsLoading] = useState<boolean>(true);
  const [biliLoading, setBiliLoading] = useState<boolean>(true);

  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      //get cache trends
      const cache = new Cache();
      const cacheWeiBo = cache.get(CacheKey.WEI_BO);
      if (typeof cacheWeiBo === "string") {
        setWeiboTrend((JSON.parse(cacheWeiBo) as Trend[]).slice(0, itemCount));
      }
      const cacheZhiHu = cache.get(CacheKey.ZHI_HU);
      if (typeof cacheZhiHu === "string") {
        setZhihuTrend((JSON.parse(cacheZhiHu) as Trend[]).slice(0, itemCount));
      }
      const cacheDouYin = cache.get(CacheKey.DOU_YIN);
      if (typeof cacheDouYin === "string") {
        setDouyinTrend((JSON.parse(cacheDouYin) as Trend[]).slice(0, itemCount));
      }
      const cacheBiadu = cache.get(CacheKey.BAI_DU);
      if (typeof cacheBiadu === "string") {
        setBaiduTrend((JSON.parse(cacheBiadu) as Trend[]).slice(0, itemCount));
      }
      const cacheTouTiao = cache.get(CacheKey.TOU_TIAO);
      if (typeof cacheTouTiao === "string") {
        setToutiaoTrend((JSON.parse(cacheTouTiao) as Trend[]).slice(0, itemCount));
      }
      const cacheTouTiaoNews = cache.get(CacheKey.TOU_TIAO_NEWS);
      if (typeof cacheTouTiaoNews === "string") {
        setToutiaoNewsTrend((JSON.parse(cacheTouTiaoNews) as Trend[]).slice(0, itemCount));
      }
      const cacheBili = cache.get(CacheKey.BILI);
      if (typeof cacheBili === "string") {
        setBiliTrend((JSON.parse(cacheBili) as Trend[]).slice(0, itemCount));
      }

      const cacheRefreshTime = cache.get(CacheKey.REFRESH_TIME);
      if (typeof cacheRefreshTime === "string") {
        const lastRefreshTime = parseInt(cacheRefreshTime);
        const refreshInterval = Date.now() - lastRefreshTime;
        setLastRefreshTime(lastRefreshTime);
        if (refreshInterval < 5 * 60 * 1000) {
          console.log("refresh interval less than 5 minutes, skip refresh");
          setWeiboLoading(false);
          setZhihuLoading(false);
          setDouyinLoading(false);
          setBaiduLoading(false);
          setToutiaoLoading(false);
          setToutiaoNewsLoading(false);
          setBiliLoading(false);
          return;
        }
      }
      cache.set(CacheKey.REFRESH_TIME, String(Date.now()));

      //get trends
      fetch(WEIBO_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setWeiboTrend(list);
          cache.set(CacheKey.WEI_BO, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setWeiboLoading(false);
        });

      fetch(ZHIHU_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setZhihuTrend(list);
          cache.set(CacheKey.ZHI_HU, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setZhihuLoading(false);
        });

      fetch(DOUYIN_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setDouyinTrend(list);
          cache.set(CacheKey.DOU_YIN, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setDouyinLoading(false);
        });

      fetch(BAIDU_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setBaiduTrend(list);
          cache.set(CacheKey.BAI_DU, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setBaiduLoading(false);
        });

      fetch(TOUTIAO_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setToutiaoTrend(list);
          cache.set(CacheKey.TOU_TIAO, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setToutiaoLoading(false);
        });

      fetch(TOUTIAO_NEWS_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setToutiaoNewsTrend(list);
          cache.set(CacheKey.TOU_TIAO_NEWS, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setToutiaoNewsLoading(false);
        });

      fetch(BILI_TENAPI)
        .then((response) => response.json())
        .then((res) => {
          const rowList = (res as TenHotRes).data;
          const list = rowList.slice(0, itemCount);
          setBiliTrend(list);
          cache.set(CacheKey.BILI, JSON.stringify(rowList));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setBiliLoading(false);
        });
    } catch (e) {
      console.error(String(e));
      if (e instanceof AbortError) {
        return;
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    weiBoTrends: weiboTrend,
    zhiHuTrends: zhihuTrend,
    douYinTrends: douyinTrend,
    baiduTrend: baiduTrend,
    toutiaoTrend: toutiaoTrend,
    toutiaoNewsTrend: toutiaoNewsTrend,
    biliTrend: biliTrend,
    loading:
      weiboLoading ||
      zhihuLoading ||
      douyinLoading ||
      baiduLoading ||
      toutiaoLoading ||
      toutiaoNewsLoading ||
      biliLoading,
    lastRefreshTime: lastRefreshTime,
  };
};
