import { useCachedPromise } from "@raycast/utils";
import { fetchAllContactPhotos, fetchAppleContacts } from "./apple-contacts";
import { t } from "./i18n";

export function useContacts() {
  return useCachedPromise(fetchAppleContacts, [], {
    keepPreviousData: true,
    failureToastOptions: { title: t("toast_failed_load_contacts") },
  });
}

// Eagerly fetches all contact photos in a single bulk call so avatars are
// ready before the user selects a contact. The returned map is keyed by
// contact id (e.g. "apple:<uuid>") and values are data: URLs.
export function useContactPhotos() {
  return useCachedPromise(fetchAllContactPhotos, [], {
    keepPreviousData: true,
  });
}
