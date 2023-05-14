import { Identity } from "~/types/vault";

const IDENTITY_KEY_LABEL: Record<keyof Identity, string> = {
  title: "Title",
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  username: "Username",
  company: "Company",
  ssn: "Social Security number",
  passportNumber: "Passport number",
  licenseNumber: "License number",
  email: "Email",
  phone: "Phone",
  address1: "Address 1",
  address2: "Address 2",
  address3: "Address 3",
  city: "City / Town",
  state: "State / Province",
  postalCode: "Zip / Postal code",
  country: "Country",
};

export function getIdentityDetailsMarkdown(itemName: string, identity: Identity) {
  return `# 🪪 ${itemName}
<br></br>
| **Field** | **Value** |
| --- | --- |
${Object.entries(identity)
  .sort(identityFormOrderSorter)
  .map(([key, value]) => (value ? `| **${IDENTITY_KEY_LABEL[key as keyof Identity]}** | ${value} |` : null))
  .join("\n")}
`;
}

export function getIdentityDetailsCopyValue(identity: Identity): string {
  return Object.entries(identity)
    .sort(identityFormOrderSorter)
    .map(([key, value]) => (value ? `${IDENTITY_KEY_LABEL[key as keyof Identity]}: ${value}` : null))
    .filter(Boolean)
    .join("\n");
}

const IDENTITY_KEY_LABEL_KEYS = Object.keys(IDENTITY_KEY_LABEL);
/** sorts the fields according to the order they appear on bitwarden's web vault form */
export function identityFormOrderSorter([a]: string | [string, any], [b]: string | [string, any]) {
  const aIndex = IDENTITY_KEY_LABEL_KEYS.indexOf((Array.isArray(a) ? a[0] : a) as keyof Identity);
  const bIndex = IDENTITY_KEY_LABEL_KEYS.indexOf((Array.isArray(b) ? b[0] : b) as keyof Identity);
  return aIndex - bIndex;
}
