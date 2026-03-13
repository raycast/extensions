import { Cache } from "@raycast/api";
import { recommendApi } from "../api/recommend";
import { ArticleData, RecommendFeedRespDto } from "../Dto/recommendRespDto";
import { RecommendNews } from "../model/recommendNews";
import { RecommendFeedCategory } from "../utils/recommendFeedCategory";

const CACHE_DUATION_IN_MS = 10 * 60 * 1000;

const cache = new Cache();

export function requestRecommendFeed(
  categoryId: RecommendFeedCategory,
  onSuccess: (data: RecommendNews[]) => void,
  onError: (error: string) => void,
) {
  const cachedData = cache.get(categoryId);
  if (cachedData) {
    const cachedEntry = JSON.parse(cachedData);
    if (cachedEntry.timestamp + CACHE_DUATION_IN_MS > Date.now()) {
      onSuccess(cachedEntry.list);
      return;
    } else {
      console.log(`recommend feed cache expired: ${categoryId}`);
    }
  }

  recommendApi
    .recommendFeed(
      {
        uuid: "7293568760983307826",
        aid: "6587",
      },
      {
        limit: 15,
        client_type: 6587,
        cursor: "0",
        id_type: 1,
        cate_id: categoryId,
        sort_type: 200,
      },
    )
    .then((res) => {
      try {
        const data = res.data as RecommendFeedRespDto;
        if (data.err_no !== 0 || !data.data) {
          console.log(`request juejin recommend feed error: ${data.err_msg}`);
          onError("request error");
        } else {
          console.log(data.data);

          const list = parseRecommendNews(data.data);
          cache.set(
            categoryId,
            JSON.stringify({
              timestamp: Date.now(),
              list: list,
            }),
          );

          onSuccess(list);
        }
      } catch (error) {
        console.log(`request juejin recommend feed error: ${error}`);
        onError("request error");
      }
    });

  function parseRecommendNews(data: ArticleData[]): RecommendNews[] {
    const list: RecommendNews[] = [];
    data.forEach((item) => {
      const news = {
        articleId: item.article_id,
        title: item.article_info.title,
        subTitle: item.article_info.brief_content,
        readTime: item.article_info.read_time,
        viewCount: item.article_info.view_count,
        collectCount: item.article_info.collect_count,
        diggCount: item.article_info.digg_count,
        commentCount: item.article_info.comment_count,
        userName: item.author_user_info.user_name,
        categoryName: item.category.category_name,
      };
      list.push(news);
    });
    return list;
  }
}
