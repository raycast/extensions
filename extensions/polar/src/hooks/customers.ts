import { CustomersListRequest } from "@polar-sh/sdk/models/operations";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { PolarContext } from "../providers";

export const useCustomers = (
  parameters: CustomersListRequest,
  limit: number,
) => {
  const polar = useContext(PolarContext);

  return useInfiniteQuery({
    queryKey: ["customers", parameters],
    queryFn: ({ pageParam = 1 }) =>
      polar.customers.list({ ...parameters, page: pageParam, limit: limit }),
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
