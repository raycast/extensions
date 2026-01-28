import type { PaginationOptions } from "@raycast/utils";
import { createPaynowPaginatedQuery } from "../create-paynow-paginated-query";
import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";

export const useOrdersList = createPaynowPaginatedQuery({
  queryKey: "ordersList",
  queryFn: async (api, options: PaginationOptions<ManagementSchemas["OrderDto"][]>) => {
    const { data } = await api.management.orders.getOrders({
      params: {
        limit: 100,
        ...(options.lastItem ? { cursor: options.lastItem.id } : {}),
      },
    });
    const hasMore = data.length === 100;
    return { data: data.slice(0, 99), hasMore, cursor: hasMore ? data[99].id : undefined };
  },
});
