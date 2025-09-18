import { Color, Icon, LocalStorage } from "@raycast/api";
import { Contact, LocalFavorites, ContactBirthday } from "./types";

// Key for local storage of favorites
const FAVORITES_STORAGE_KEY = "google_contacts_local_favorites";

// Get favorites from local storage
export async function getLocalFavorites(): Promise<LocalFavorites> {
  try {
    const data = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as LocalFavorites;
    }
  } catch (error) {
    console.error("Error loading favorites:", error);
  }
  return {};
}

// Save favorites to local storage
export async function saveLocalFavorites(favorites: LocalFavorites): Promise<void> {
  try {
    await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Error saving favorites:", error);
  }
}

// Check if a contact is a favorite
export function isFavorite(contact: Contact, localFavorites: LocalFavorites): boolean {
  return localFavorites[contact.resourceName] || false;
}

// Toggle a contact's favorite status locally
export async function toggleLocalFavorite(contact: Contact): Promise<boolean> {
  const favorites = await getLocalFavorites();
  const isFav = favorites[contact.resourceName] || false;

  // Toggle status
  favorites[contact.resourceName] = !isFav;

  // Save updated favorites
  await saveLocalFavorites(favorites);

  // Return new status
  return !isFav;
}

export function getPrimaryName(contact: Contact): string {
  if (!contact.names || contact.names.length === 0) {
    return "Unnamed Contact";
  }

  // Try to find the primary name
  const primaryName = contact.names.find((name) => name.metadata?.primary);

  // If primary name exists, use it, otherwise use the first name
  const nameToUse = primaryName || contact.names[0];

  if (nameToUse.displayName) {
    return nameToUse.displayName;
  }

  // Construct name from parts if displayName is not available
  const parts = [];
  if (nameToUse.givenName) parts.push(nameToUse.givenName);
  if (nameToUse.middleName) parts.push(nameToUse.middleName);
  if (nameToUse.familyName) parts.push(nameToUse.familyName);

  return parts.length > 0 ? parts.join(" ") : "Unnamed Contact";
}

// Get just the first and last name without middle name
export function getFirstLastName(contact: Contact): string {
  if (!contact.names || contact.names.length === 0) {
    return "Unnamed Contact";
  }

  // Try to find the primary name
  const primaryName = contact.names.find((name) => name.metadata?.primary);

  // If primary name exists, use it, otherwise use the first name
  const nameToUse = primaryName || contact.names[0];

  const firstName = nameToUse.givenName || "";
  const lastName = nameToUse.familyName || "";

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else if (nameToUse.displayName) {
    // If no given/family name but display name exists, use it
    return nameToUse.displayName;
  }

  return "Unnamed Contact";
}

export function getPrimaryEmail(contact: Contact): string | undefined {
  if (!contact.emailAddresses || contact.emailAddresses.length === 0) {
    return undefined;
  }

  // Try to find the primary email
  const primaryEmail = contact.emailAddresses.find((email) => email.metadata?.primary);

  // If primary email exists, use it, otherwise use the first email
  return primaryEmail?.value || contact.emailAddresses[0].value;
}

export function getPrimaryPhone(contact: Contact): string | undefined {
  if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
    return undefined;
  }

  // Try to find the primary phone
  const primaryPhone = contact.phoneNumbers.find((phone) => phone.metadata?.primary);

  // If primary phone exists, use it, otherwise use the first phone
  return primaryPhone?.value || contact.phoneNumbers[0].value;
}

export function getPrimaryAddress(contact: Contact): string | undefined {
  if (!contact.addresses || contact.addresses.length === 0) {
    return undefined;
  }

  // Try to find the primary address
  const primaryAddress = contact.addresses.find((address) => address.metadata?.primary);

  // If primary address exists, use it, otherwise use the first address
  const addressToUse = primaryAddress || contact.addresses[0];

  return addressToUse.formattedValue || formatAddress(addressToUse);
}

function formatAddress(address: import("./types").ContactAddress): string {
  const parts = [];

  if (address.streetAddress) parts.push(address.streetAddress);
  if (address.extendedAddress) parts.push(address.extendedAddress);
  if (address.city) parts.push(address.city);
  if (address.region) parts.push(address.region);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);

  return parts.join(", ");
}

export function getResourceId(resourceName: string): string {
  // Extract ID from resourceName format "people/12345"
  return resourceName.split("/").pop() || resourceName;
}

export function getIdNames(contacts: Contact[]): { [key: string]: string } {
  const idNames: { [key: string]: string } = {};
  for (const contact of contacts) {
    idNames[contact.resourceName] = getPrimaryName(contact);
  }
  return idNames;
}

export function getIcon(contact: Contact, localFavorites: LocalFavorites = {}): { source: Icon; tintColor?: Color } {
  // Starred contacts
  if (isFavorite(contact, localFavorites)) {
    return { source: Icon.Star, tintColor: Color.Yellow };
  }

  // Has profile photo
  if (contact.photos && contact.photos.length > 0) {
    return { source: Icon.Person };
  }

  // Default case
  return { source: Icon.PersonCircle };
}

// Format a birthday from a ContactBirthday object
export function formatBirthday(birthday: ContactBirthday): string {
  // If there's a text representation, use that
  if (birthday.text) {
    return birthday.text;
  }

  // If there's date information, format it
  if (birthday.date) {
    const { year, month, day } = birthday.date;

    // Format: dd.MM.yyyy or dd.MM depending on if year is available
    if (month && day) {
      const monthStr = month.toString().padStart(2, "0");
      const dayStr = day.toString().padStart(2, "0");

      if (year) {
        return `${dayStr}.${monthStr}.${year}`;
      } else {
        return `${dayStr}.${monthStr}`;
      }
    }
  }

  return "Unknown";
}

// Get birthday info from a contact
export function getBirthdayInfo(contact: Contact): string | undefined {
  if (!contact.birthdays || contact.birthdays.length === 0) {
    return undefined;
  }

  // Try to find the primary birthday if there are multiple
  const primaryBirthday = contact.birthdays.find((birthday) => birthday.metadata?.primary);

  // If primary birthday exists, use it, otherwise use the first birthday
  const birthdayToUse = primaryBirthday || contact.birthdays[0];

  return formatBirthday(birthdayToUse);
}
