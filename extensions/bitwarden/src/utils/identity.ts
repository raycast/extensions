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
  .map(([key, value]) => (value ? `| **${IDENTITY_KEY_LABEL[key as keyof Identity]}** | ${value} |` : null))
  .join("\n")}
`;
}

export function getIdentityDetailsCopyValue(identity: Identity): string {
  return Object.entries(identity)
    .map(([key, value]) => (value ? `${IDENTITY_KEY_LABEL[key as keyof Identity]}: ${value}` : null))
    .filter(Boolean)
    .join("\n");
}
