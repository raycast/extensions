import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import type { Data } from "@/types/company";
import { useAuthHeaders } from "./useAuthHeaders";
import { getPreferenceValues } from "@raycast/api";

export function useCompanies({ search = "" }: { search?: string }) {
  const preferences = getPreferenceValues();
  const customProperties = preferences.customCompanyProperties
    ? preferences.customCompanyProperties.split(",").map((prop: string) => prop.trim())
    : [];

  const defaultProperties = ["name", "createdate", "domain", "lastmodifieddate", "description", "industry"];

  const properties = [...defaultProperties, ...customProperties];

  // This hook is used to fetch companies by search query (this searches through website, phone, name, domain)
  const usedSearchByName = useFetch<Data>(`https://api.hubapi.com/crm/v3/objects/companies/search`, {
    method: "post",
    headers: useAuthHeaders(),
    body: JSON.stringify({
      query: search,
      limit: 20,
      properties,
    }),
    keepPreviousData: true,
  });

  // This hook is used to fetch companies by search query (this searches through description)
  // Only fire this query if the search query is not empty
  const usedSearchByDescription = useFetch<Data>(`https://api.hubapi.com/crm/v3/objects/companies/search`, {
    method: "post",
    headers: useAuthHeaders(),
    body: JSON.stringify({
      limit: 20,
      properties,
      filterGroups: [
        {
          filters: [
            {
              propertyName: "description",
              operator: "CONTAINS_TOKEN",
              value: `*${search}*`,
            },
          ],
        },
      ],
    }),
    keepPreviousData: true,
    execute: search.length > 0,
  });

  // Combined loading state for both search queries
  const isLoading = usedSearchByName.isLoading || usedSearchByDescription.isLoading;

  // Revalidate function to revalidate both search queries
  const revalidate = () => {
    usedSearchByName.revalidate();
    usedSearchByDescription.revalidate();
  };

  // Combined data state for both search queries
  // This takes the normal search results and adds the description search results to it (filtering out duplicates)
  const data: Data = useMemo(() => {
    const searchResults = usedSearchByName.data?.results || [];
    const searchDescriptions = usedSearchByDescription.data?.results || [];

    const filteredDescriptionSearch = searchDescriptions.filter(
      (company) => !searchResults.some((c) => c.id === company.id),
    );
    const results = [...searchResults, ...filteredDescriptionSearch];

    return {
      total: results.length,
      results,
      paging: {
        next: {
          after: "",
          link: "",
        },
      },
    };
  }, [usedSearchByName.data, usedSearchByDescription.data]);

  return { isLoading, data, revalidate };
}
