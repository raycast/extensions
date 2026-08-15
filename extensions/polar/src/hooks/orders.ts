import { OrdersListRequest } from "@polar-sh/sdk/dist/commonjs/models/operations/orderslist";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { PolarContext } from "../providers";

export const useOrders = (parameters: OrdersListRequest, limit: number) => {
  const polar = useContext(PolarContext);

  return useInfiniteQuery({
    queryKey: ["orders", parameters],
    queryFn: ({ pageParam = 1 }) =>
      polar.orders.list({ ...parameters, page: pageParam, limit: limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      const totalPages = Math.ceil(
        lastPage.result.pagination.totalCount / limit,
      );
      const nextPage = totalPages > currentPage ? currentPage + 1 : undefined;

      return nextPage;
    },
  });
};
