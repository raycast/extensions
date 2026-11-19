import { ItemType } from "./types";

/** A field of a card, identity, alias, SSH key or Wi-Fi network: its row in the details and its Copy action. */
export interface FieldSpec {
  /** Key of the value in `ItemDetail.fields`, and ID of the row. */
  id: string;
  title: string;
  /** Masked in the details, and kept out of the clipboard history when copied. */
  secret?: boolean;
  /** Shown only when filled; the other fields are always shown, so that they stay in place while browsing. */
  optional?: boolean;
  /** Copied only: its value is already shown in another row (an address's parts are in its Address row). */
  copyOnly?: boolean;
  /** The last 4 digits stay visible, so that a card can be told apart without showing its number. */
  showLastDigits?: boolean;
  /** Takes ⌘C, as Copy Password does on logins. */
  isMain?: boolean;
}

const CREDIT_CARD_FIELDS: FieldSpec[] = [
  { id: "cardholderName", title: "Cardholder Name" },
  { id: "cardNumber", title: "Card Number", secret: true, showLastDigits: true, isMain: true },
  { id: "expirationDate", title: "Expiration Date" },
  { id: "securityCode", title: "Security Code", secret: true },
  { id: "pin", title: "PIN", secret: true },
];

/** In the order of Proton Pass: personal details, address, contact details, then work details. */
const IDENTITY_FIELDS: FieldSpec[] = [
  { id: "fullName", title: "Full Name" },
  { id: "identityEmail", title: "Email" },
  { id: "phoneNumber", title: "Phone Number" },
  { id: "address", title: "Address" },
  { id: "firstName", title: "First Name", optional: true },
  { id: "middleName", title: "Middle Name", optional: true },
  { id: "lastName", title: "Last Name", optional: true },
  { id: "birthdate", title: "Birthdate", optional: true },
  { id: "gender", title: "Gender", optional: true },
  { id: "organization", title: "Organization", optional: true },
  { id: "streetAddress", title: "Street Address", optional: true, copyOnly: true },
  { id: "floor", title: "Floor", optional: true, copyOnly: true },
  { id: "zipOrPostalCode", title: "ZIP or Postal Code", optional: true, copyOnly: true },
  { id: "city", title: "City", optional: true, copyOnly: true },
  { id: "stateOrProvince", title: "State or Province", optional: true, copyOnly: true },
  { id: "county", title: "County", optional: true, copyOnly: true },
  { id: "countryOrRegion", title: "Country or Region", optional: true, copyOnly: true },
  { id: "socialSecurityNumber", title: "Social Security Number", optional: true, secret: true },
  { id: "passportNumber", title: "Passport Number", optional: true, secret: true },
  { id: "licenseNumber", title: "License Number", optional: true, secret: true },
  { id: "identityWebsite", title: "Website", optional: true },
  { id: "xHandle", title: "X Handle", optional: true },
  { id: "secondPhoneNumber", title: "Second Phone Number", optional: true },
  { id: "linkedin", title: "LinkedIn", optional: true },
  { id: "reddit", title: "Reddit", optional: true },
  { id: "facebook", title: "Facebook", optional: true },
  { id: "yahoo", title: "Yahoo", optional: true },
  { id: "instagram", title: "Instagram", optional: true },
  { id: "company", title: "Company", optional: true },
  { id: "jobTitle", title: "Job Title", optional: true },
  { id: "personalWebsite", title: "Personal Website", optional: true },
  { id: "workPhoneNumber", title: "Work Phone Number", optional: true },
  { id: "workEmail", title: "Work Email", optional: true },
];

const TYPE_FIELDS: Partial<Record<ItemType, FieldSpec[]>> = {
  credit_card: CREDIT_CARD_FIELDS,
  identity: IDENTITY_FIELDS,
  alias: [{ id: "aliasAddress", title: "Alias Address", isMain: true }],
  ssh_key: [
    { id: "publicKey", title: "Public Key" },
    { id: "privateKey", title: "Private Key", secret: true },
  ],
  wifi: [
    { id: "ssid", title: "Network Name" },
    { id: "wifiPassword", title: "Password", secret: true, isMain: true },
    { id: "security", title: "Security" },
  ],
};

/** The fields of an item's type, in the order they're shown. Logins, notes and custom items have none of these. */
export function fieldsOf(type: ItemType): FieldSpec[] {
  return TYPE_FIELDS[type] ?? [];
}

/** The parts of an identity's Address row, in the order they're written. */
export const ADDRESS_PARTS = [
  "streetAddress",
  "floor",
  "zipOrPostalCode",
  "city",
  "stateOrProvince",
  "county",
  "countryOrRegion",
] as const;

/** "12 Example Street, 75000 Paris, France": the ZIP or postal code goes before the city, as in most countries. */
export function formatAddress(fields: Record<string, string>): string | undefined {
  const parts = ADDRESS_PARTS.map((id) => fields[id]);
  const [street, floor, zip, city, state, county, country] = parts;
  const cityLine = [zip, city].filter(Boolean).join(" ");
  const joined = [street, floor, cityLine, state, county, country].filter(Boolean).join(", ");
  return joined.length > 0 ? joined : undefined;
}

/** "2027-12", as pass-cli prints it, -> "12/27", as printed on cards. Other values are kept as they are. */
export function formatExpirationDate(value: string): string {
  const match = /^(\d{4})-(\d{1,2})$/.exec(value.trim());
  return match ? `${match[2].padStart(2, "0")}/${match[1].slice(2)}` : value;
}

/** "WPA2"; nothing for a network whose security wasn't set. */
export function formatWifiSecurity(value: string): string | undefined {
  return /^unspecified/i.test(value) ? undefined : value;
}

/** The last 4 digits of a card number, when it has that many. */
export function lastDigitsOf(value: string): string | undefined {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

/** "Jun 14, 2026" for a date field, saved as Unix seconds: in UTC, as pass-cli shows dates. */
export function formatFieldDate(unixSeconds: number): string | undefined {
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
