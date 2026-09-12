import {
  LearningItemsOrderBy,
  SortOrder,
  type LearningItem,
  type LearningItemList,
  type SearchParams,
  type UnsavedLearningItem,
} from "../types";
import { RestClient } from "./rest-client";

function mapOrderBy(orderBy: LearningItemsOrderBy): string {
  switch (orderBy) {
    case LearningItemsOrderBy.LAST_MODIFIED:
      return "lastModified";
    case LearningItemsOrderBy.NEXT_REVISION:
      return "aggregatedNextRevisionTs";
    default:
      return "lastModified";
  }
}

function mapOrderDirection(order: SortOrder): string {
  return order === SortOrder.ASC ? "ASC" : "DESC";
}

export class LearningItemsClient {
  constructor(private readonly restClient: RestClient) {}

  async addLearningItem(languageCode: string, learningItem: UnsavedLearningItem): Promise<LearningItem> {
    return this.restClient.post<LearningItem>(`/api/languages/${languageCode}/learning-items`, learningItem);
  }

  async updateLearningItem(languageCode: string, learningItem: LearningItem): Promise<LearningItem> {
    const { id, speechUrl, ...body } = learningItem;
    void speechUrl;
    return this.restClient.patch<LearningItem>(`/api/languages/${languageCode}/learning-items/${id}`, body);
  }

  async queryLearningItems({
    languageCode,
    textQuery,
    matchType,
    groupIds,
    searchFlags,
    order,
    pageParams,
  }: SearchParams): Promise<LearningItemList> {
    const params: Record<string, string> = {};

    if (textQuery) {
      params.text = textQuery;
    }
    if (matchType) {
      params.matchType = matchType;
    }
    if (pageParams?.page) {
      params.page = (pageParams.page - 1).toString();
    }
    if (pageParams?.pageSize) {
      params.pageSize = pageParams.pageSize.toString();
    }
    if (order?.orderBy) {
      params.orderBy = mapOrderBy(order.orderBy);
    }
    if (order?.direction) {
      params.order = mapOrderDirection(order.direction);
    }

    let endpoint = `/api/languages/${languageCode}/learning-items`;
    const searchParams = new URLSearchParams(params);

    if (groupIds) {
      groupIds.forEach((id) => searchParams.append("groupId", id));
    }
    if (searchFlags) {
      searchFlags.forEach((flag) => searchParams.append("searchFlag", flag));
    }

    const queryString = searchParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.restClient.get<LearningItemList>(endpoint);
  }

  async getLearningItem(languageCode: string, learningItemId: string): Promise<LearningItem> {
    return this.restClient.get<LearningItem>(`/api/languages/${languageCode}/learning-items/${learningItemId}`);
  }

  async deleteLearningItem(languageCode: string, learningItemId: string): Promise<void> {
    return this.restClient.delete<void>(`/api/languages/${languageCode}/learning-items/${learningItemId}`);
  }
}
