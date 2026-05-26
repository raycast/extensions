import { useCachedPromise } from "@raycast/utils";
import { fetchAppleContacts } from "./apple-contacts";

export function useContacts() {
  return useCachedPromise(fetchAppleContacts, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load Apple Contacts" },
  });
}
