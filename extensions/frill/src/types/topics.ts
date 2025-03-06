import { BaseSuccessResponse } from "./common";

export type Topic = {
  name: string;
  is_private: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  idx: string;
};

export type GetTopicsResponse = BaseSuccessResponse & { data: Topic[] };

export type CreateTopicRequest = {
  name: string;
};
export type CreateTopicResponse = { data: Topic; meta: [] };
export type DeleteTopicResponse = { success: true };
export type UpdateTopicRequest = CreateTopicRequest;
export type UpdateTopicResponse = CreateTopicResponse;
