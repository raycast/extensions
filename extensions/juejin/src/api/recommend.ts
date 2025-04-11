import { RecommendFeedDto, RecommendFeedHeaderDto } from "../Dto/recommendReqDto";
import request from "../network/request";

export const recommendApi = {
  recommendFeed: (headerParams: RecommendFeedHeaderDto, params: RecommendFeedDto) => {
    return request.post(
      `recommend_api/v1/article/recommend_cate_feed?uuid=${headerParams.uuid}&aid=${headerParams.aid}}`,
      params,
    );
  },
};
