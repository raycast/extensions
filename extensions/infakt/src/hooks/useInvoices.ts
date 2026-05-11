import { useMemo } from "react";

import { useFetch } from "@raycast/utils";

import { ApiHeaders, ApiUrls } from "@/api/helpers";
import { InvoiceObject } from "@/types/invoice";
import { ApiPaginatedResponse, Filters, UseFetchOptions } from "@/types/utils";

type Props = {
  filters?: Filters<InvoiceObject>;
  options?: UseFetchOptions<ApiPaginatedResponse<InvoiceObject[]>>;
};

export function useInvoices(
  { filters, options }: Props = {
    filters: {
      limit: 100,
      offset: 0,
    },
  },
) {
  const endpoint = new URL(ApiUrls.invoices);
  Object.entries(filters ?? {}).forEach(([key, value]) => endpoint.searchParams.append(key, String(value)));

  const { data, error, isLoading, mutate } = useFetch<ApiPaginatedResponse<InvoiceObject[]>>(endpoint.href, {
    headers: ApiHeaders,
    ...options,
  });

  const { paidInvoices, unpaidInvoices, draftInvoices } = useMemo(() => {
    const paidInvoices = data?.entities?.filter((invoice) => invoice?.status === "paid");

    const unpaidInvoices = data?.entities?.filter(
      (invoice) => invoice?.status === "sent" || invoice?.status === "printed",
    );

    const draftInvoices = data?.entities?.filter((invoice) => invoice?.status === "draft");
    return { paidInvoices, unpaidInvoices, draftInvoices };
  }, [data]);

  return {
    invoicesData: data?.entities,
    paidInvoices,
    unpaidInvoices,
    draftInvoices,
    invoicesError: error,
    invoicesIsLoading: isLoading,
    invoicesMutate: mutate,
  };
}
