import { useCachedPromise } from "@raycast/utils";
import { CountryCode, parsePhoneNumber } from "libphonenumber-js";
import { fetchAllContacts } from "swift:../../swift/contacts";

type PhoneNumber = {
  number: string;
  countryCode: string | null;
};

export type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  fullName: string;
  phoneNumbers: PhoneNumber[];
  emailAddresses: string[];
  imageData: string;
};

export function useContacts() {
  const { data, ...rest } = useCachedPromise(
    async () => {
      const contacts = await fetchAllContacts();

      return contacts.map((contact) => {
        const fullName = `${contact.givenName} ${contact.familyName}`.trim();
        return {
          ...contact,
          fullName,
          imageData: contact.imageData,
        };
      }) as Contact[];
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

  const contactMap = new Map<string, Contact>();
  data?.forEach((contact) => {
    contact.phoneNumbers.forEach(({ number, countryCode }) => {
      try {
        const parsedNumber = parsePhoneNumber(number, countryCode?.toUpperCase() as CountryCode);
        if (parsedNumber) {
          contactMap.set(parsedNumber.format("E.164"), contact);
        }
      } catch (error) {
        console.error(`Error parsing phone number ${number}:`, error);
      }

      // Also add the original number as a fallback
      contactMap.set(number, contact);
    });
  });

  return { data, contactMap, ...rest };
}
