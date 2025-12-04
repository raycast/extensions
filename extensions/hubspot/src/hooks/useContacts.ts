import { useFetch } from "@raycast/utils";
import type { Data } from "@/types/contact";
import { useAuthHeaders } from "./useAuthHeaders";

export function useContacts({ search = "" }: { search?: string }) {
  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
    method: "post",
    headers: useAuthHeaders(),
    body: JSON.stringify({
      query: search,
      limit: 20,
      properties: ["firstname", "lastname", "email", "phone", "company", "createdate", "website"],
    }),
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
