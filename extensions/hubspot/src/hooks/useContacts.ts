import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Data } from "../types/contact";

export function useContacts({ search = "" }: { search?: string }) {
  const preferences = getPreferenceValues();
  const accessToken = preferences?.accessToken;

  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: search,
      limit: 20,
      properties: ["firstname", "lastname", "email", "phone", "company", "createdate", "website"],
    }),
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
