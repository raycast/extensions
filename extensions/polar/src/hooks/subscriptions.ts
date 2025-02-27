import { useInfiniteQuery } from "@tanstack/react-query";
import { SubscriptionsListRequest } from "@polar-sh/sdk/models/operations";
import { PolarContext } from "../providers";
import { useContext } from "react";

export const useListSubscriptions = (
  parameters: SubscriptionsListRequest,
  limit: number,
) => {
  const polar = useContext(PolarContext);

  return useInfiniteQuery({
    queryKey: ["subscriptions", parameters],
    queryFn: ({ pageParam = 1 }) =>
      polar.subscriptions.list({
        ...parameters,
        page: pageParam,
        limit: limit,
      }),
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
