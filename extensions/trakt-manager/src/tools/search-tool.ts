import { initTraktClient } from "../lib/client";
import { withPagination } from "../lib/schema";

type ToolInput = {
  title: string;
  page: number;
};

type ToolSearchResponse<T> = {
  status: number;
  body: T[];
  headers: Headers;
};

type ToolSearchEndpoint<T> = (args: {
  query: {
    query: string;
    page: number;
    limit: 10;
    fields: "title";
    extended: "full,cloud9";
  };
  fetchOptions: { signal: AbortSignal };
}) => Promise<ToolSearchResponse<T>>;

const traktClient = initTraktClient();

export function createSearchTool<T, TInput extends ToolInput = ToolInput>(search: ToolSearchEndpoint<T>) {
  return async (input: TInput) => {
    const { title, page } = input;
    const response = await search({
      query: {
        query: title,
        page,
        limit: 10,
        fields: "title",
        extended: "full,cloud9",
      },
      fetchOptions: {
        signal: AbortSignal.timeout(3600),
      },
    });

    if (response.status !== 200) return { data: [], hasMore: false };
    const paginatedResponse = withPagination(response);

    return {
      data: paginatedResponse.data,
      hasMore:
        paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
    };
  };
}

export const toolTraktClient = traktClient;
