import { useFetch } from "@raycast/utils";

import { ApiHeaders, ApiUrls } from "@/api/helpers";
import { BankAccountObject } from "@/types/bank_account";
import { ApiPaginatedResponse, Filters, UseFetchOptions } from "@/types/utils";

type Props = {
  filters?: Filters<BankAccountObject>;
  options?: UseFetchOptions<ApiPaginatedResponse<BankAccountObject[]>>;
};

export function useBankAccounts(
  { filters, options }: Props = {
    filters: {
      limit: 100,
      offset: 0,
    },
  },
) {
  const endpoint = new URL(ApiUrls.bank_accounts);
  Object.entries(filters ?? {}).forEach(([key, value]) => endpoint.searchParams.append(key, String(value)));

  const { data, error, isLoading, mutate } = useFetch<ApiPaginatedResponse<BankAccountObject[]>>(endpoint.href, {
    headers: ApiHeaders,
    ...options,
  });

  return {
    bankAccountsData: data?.entities,
    bankAccountsError: error,
    bankAccountsIsLoading: isLoading,
    bankAccountsMutate: mutate,
  };
}
