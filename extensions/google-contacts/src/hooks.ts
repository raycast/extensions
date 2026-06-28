import { useCachedPromise } from "@raycast/utils";
import { getAccessToken } from "@raycast/utils";
import { fetchAllContacts, fetchContactGroups, SortOrder } from "./api";

export function useContacts(sortOrder: SortOrder = "FIRST_NAME_ASCENDING") {
  return useCachedPromise(
    async (sort: SortOrder) => {
      const { token } = getAccessToken();
      return fetchAllContacts(token, sort);
    },
    [sortOrder],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load contacts" },
    },
  );
}

export function useContactGroups() {
  return useCachedPromise(
    async () => {
      const { token } = getAccessToken();
      const groups = await fetchContactGroups(token);
      return groups.filter((g) => g.groupType === "USER_CONTACT_GROUP");
    },
    [],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load contact groups" },
    },
  );
}
