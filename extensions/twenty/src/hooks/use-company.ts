import { useState, useCallback } from "react";
import { useFetch } from "@raycast/utils";
import { useAuthHeaders } from "./use-auth-headers";

// In this case, we just need this.
interface Company {
  id: string;
  name: string;
  employees: number;
  address: {
    addressStreet1: string | null;
    addressStreet2: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    addressState: string | null;
    addressCountry: string | null;
    addressLat: string | null;
    addressLng: string | null;
  };
  annualRecurringRevenue: {
    amountMicros: number;
    currencyCode: string;
  };
  people: [
    {
      name: {
        firstName: string;
        lastName: string;
      };
      emails: {
        primaryEmail: string;
      };
      jobTitle: string;
    },
  ];
}

interface CompaniesResponse {
  data: {
    companies: Company[];
  };
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

interface UseGetCompaniesOptions {
  limit?: number;
  orderBy?: string;
  initialCursor?: string;
}

export function useGetCompanies({ limit = 20, orderBy = "name", initialCursor }: UseGetCompaniesOptions = {}) {
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);

  const { data, isLoading, error, revalidate } = useFetch<CompaniesResponse>(
    `https://api.twenty.com/rest/companies?limit=${limit}&order_by=${orderBy}${cursor ? `&starting_after=${cursor}` : ""}`,
    {
      headers: useAuthHeaders(),
    },
  );

  const loadMore = useCallback(() => {
    if (data?.pageInfo.hasNextPage) {
      setCursor(data.pageInfo.endCursor);
      setAllCompanies((prev) => [...prev, ...data.data.companies]);
    }
  }, [data]);

  const companies = allCompanies.length > 0 ? allCompanies : (data?.data.companies ?? []);

  return {
    companies,
    isLoading,
    error,
    loadMore,
    hasMore: data?.pageInfo.hasNextPage ?? false,
    revalidate,
  };
}
