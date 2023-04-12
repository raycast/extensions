import { useCallback, useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import {
  CacheKey,
  douyinTrendApi,
  ResponseDataDouYin,
  ResponseDataWeiBo,
  ResponseDataZhiHu,
  TrendDouYin,
  TrendWeiBo,
  TrendZhiHu,
  weiboTrendApi,
  zhihuTrendApi,
} from "../utils/trend-utils";
import { Cache } from "@raycast/api";

export const getTrends = () => {
  const [weiboTrend, setWeiboTrend] = useState<TrendWeiBo[]>([]);
  const [douyinTrend, setDouyinTrend] = useState<TrendDouYin[]>([]);
  const [zhihuTrend, setZhihuTrend] = useState<TrendZhiHu[]>([]);

  const fetchData = useCallback(async () => {
    try {
      //get cache trends
      const cache = new Cache();
      const cacheWeiBo = cache.get(CacheKey.WEI_BO);
      if (typeof cacheWeiBo === "string") {
        setWeiboTrend(JSON.parse(cacheWeiBo));
      }
      const cacheZhiHu = cache.get(CacheKey.ZHI_HU);
      if (typeof cacheZhiHu === "string") {
        setZhihuTrend(JSON.parse(cacheZhiHu));
      }
      const cacheDouYin = cache.get(CacheKey.DOU_YIN);
      if (typeof cacheDouYin === "string") {
        setDouyinTrend(JSON.parse(cacheDouYin));
      }
      //get trends
      fetch(weiboTrendApi)
        .then((response) => response.json())
        .then((res) => {
          const list = (res as ResponseDataWeiBo).list.slice(0, 10);
          cache.set(CacheKey.WEI_BO, JSON.stringify(list));
          setWeiboTrend(list);
        });
      fetch(zhihuTrendApi)
        .then((response) => response.json())
        .then((res) => {
          const list = (res as ResponseDataZhiHu).list.slice(0, 10);
          cache.set(CacheKey.ZHI_HU, JSON.stringify(list));
          setZhihuTrend(list);
        });
      fetch(douyinTrendApi)
        .then((response) => response.json())
        .then((res) => {
          const list = (res as ResponseDataDouYin).list.slice(0, 10);
          cache.set(CacheKey.DOU_YIN, JSON.stringify(list));
          setDouyinTrend(list);
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

  return { weiBoTrends: weiboTrend, zhiHuTrends: zhihuTrend, douYinTrends: douyinTrend };
};
