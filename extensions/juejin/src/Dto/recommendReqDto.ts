export interface RecommendFeedDto {
  limit: number;
  client_type: number;
  cursor: string;
  id_type: number;
  cate_id: string;
  sort_type: number;
}

export interface RecommendFeedHeaderDto {
  aid: string;
  uuid: string;
}
