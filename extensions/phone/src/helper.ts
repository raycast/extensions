import { useCachedPromise } from "@raycast/utils";
import { fetchAllContacts } from "swift:../swift/contacts";
import { Contact } from "./interfaces";

export function useContacts() {
  const { data: contacts, isLoading } = useCachedPromise(
    async () => {
      const contacts = await fetchAllContacts();
      return contacts as Contact[];
    },
    [],
    {
      failureToastOptions: {
        title: "Could not get contacts",
        message: "Make sure you have granted Raycast access to your contacts.",
        primaryAction: {
          title: "Open System Preferences",
          onAction() {
            open("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts");
          },
        },
      },
    },
  );

  return { contacts, isLoading };
}
