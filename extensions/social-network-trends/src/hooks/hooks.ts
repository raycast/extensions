import { useCallback, useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import {
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

export const getTrends = () => {
  const [weiboTrend, setWeiboTrend] = useState<TrendWeiBo[]>([]);
  const [douyinTrend, setDouyinTrend] = useState<TrendDouYin[]>([]);
  const [zhihuTrend, setZhihuTrend] = useState<TrendZhiHu[]>([]);

  const fetchData = useCallback(async () => {
    try {
      //get trends
      fetch(weiboTrendApi)
        .then((response) => response.json())
        .then((res) => {
          setWeiboTrend((res as ResponseDataWeiBo).list);
        });
      fetch(zhihuTrendApi)
        .then((response) => response.json())
        .then((res) => {
          setZhihuTrend((res as ResponseDataZhiHu).list);
        });
      fetch(douyinTrendApi)
        .then((response) => response.json())
        .then((res) => {
          setDouyinTrend((res as ResponseDataDouYin).list);
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
