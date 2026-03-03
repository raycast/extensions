import { Icon } from "@raycast/api";
import { Card, Field, FieldType, Identity, Item, ItemType, Login, SshKey } from "~/types/vault";
import { FieldSection, ItemField } from "../types/item-field";

/**
 * Builds field sections for a login vault item.
 *
 * Produces up to two sections:
 * 1. **Login** — username (text), password (hidden), and TOTP (totp) fields.
 * 2. **URIs** — one link field per non-empty URI attached to the login.
 *
 * Empty sections are omitted.
 *
 * @param login - The login data from the vault item.
 * @returns An array of {@link FieldSection}s, potentially empty if the login has no populated fields.
 */
function buildLoginSections(login: Login): FieldSection[] {
  const sections: FieldSection[] = [];
  const fields: ItemField[] = [];

  if (login.username) {
    fields.push({
      type: "text",
      id: "login.username",
      label: "Username",
      value: login.username,
      icon: Icon.PersonCircle,
    });
  }
  if (login.password) {
    fields.push({
      type: "hidden",
      id: "login.password",
      label: "Password",
      value: login.password,
    });
  }
  if (login.totp) {
    fields.push({
      type: "totp",
      id: "login.totp",
      label: "TOTP",
      secretLabel: "TOTP Secret",
      value: login.totp,
      icon: Icon.Clock,
    });
  }

  if (fields.length > 0) sections.push({ title: "Login", fields });

  if (login.uris && login.uris.length > 0) {
    const uriFields: ItemField[] = login.uris
      .filter((u) => u.uri)
      .map((u, i) => ({
        type: "link",
        id: `login.uri.${i}`,
        label: login.uris!.length === 1 ? "URI" : `URI ${i + 1}`,
        value: u.uri!,
      }));
    if (uriFields.length > 0) sections.push({ title: "URIs", fields: uriFields });
  }

  return sections;
}

/**
 * Builds field sections for an identity vault item.
 *
 * Produces up to three sections:
 * 1. **Personal Details** — full name (composed from title/first/middle/last), username, company.
 * 2. **Identification** — SSN (hidden), passport number, license number.
 * 3. **Contact Information** — email, phone, and a multi-line address composed from
 *    address lines, city/state/postal code, and country.
 *
 * Each section is only included when at least one of its fields has a value.
 *
 * @param identity - The identity data from the vault item.
 * @returns An array of {@link FieldSection}s, potentially empty if no identity fields are populated.
 */
function buildIdentitySections(identity: Identity): FieldSection[] {
  const sections: FieldSection[] = [];

  // Personal Details
  const personalFields: ItemField[] = [];

  const nameParts = [identity.title, identity.firstName, identity.middleName, identity.lastName].filter(Boolean);
  if (nameParts.length > 0) {
    personalFields.push({
      type: "text",
      id: "identity.name",
      label: "Name",
      value: nameParts.join(" "),
      icon: Icon.Person,
    });
  }
  if (identity.username) {
    personalFields.push({
      type: "text",
      id: "identity.username",
      label: "Username",
      value: identity.username,
      icon: Icon.PersonCircle,
    });
  }
  if (identity.company) {
    personalFields.push({
      type: "text",
      id: "identity.company",
      label: "Company",
      value: identity.company,
      icon: Icon.Building,
    });
  }
  if (personalFields.length > 0) sections.push({ title: "Personal Details", fields: personalFields });

  // Identification
  const identificationFields: ItemField[] = [];

  if (identity.ssn) {
    identificationFields.push({
      type: "hidden",
      id: "identity.ssn",
      label: "Social Security Number",
      value: identity.ssn,
      icon: Icon.Fingerprint,
    });
  }
  if (identity.passportNumber) {
    identificationFields.push({
      type: "hidden",
      id: "identity.passportNumber",
      label: "Passport Number",
      value: identity.passportNumber,
      icon: Icon.Airplane,
    });
  }
  if (identity.licenseNumber) {
    identificationFields.push({
      type: "text",
      id: "identity.licenseNumber",
      label: "License Number",
      value: identity.licenseNumber,
      icon: Icon.CreditCard,
    });
  }
  if (identificationFields.length > 0) sections.push({ title: "Identification", fields: identificationFields });

  // Contact Information
  const contactFields: ItemField[] = [];

  if (identity.email) {
    contactFields.push({
      type: "text",
      id: "identity.email",
      label: "Email",
      value: identity.email,
      icon: Icon.Envelope,
    });
  }
  if (identity.phone) {
    contactFields.push({
      type: "text",
      id: "identity.phone",
      label: "Phone",
      value: identity.phone,
      icon: Icon.Phone,
    });
  }

  const addressLines: string[] = [identity.address1, identity.address2, identity.address3].filter(Boolean) as string[];

  const cityStateZip = [identity.city, identity.state, identity.postalCode].filter(Boolean).join(", ");
  if (cityStateZip) addressLines.push(cityStateZip);
  if (identity.country) addressLines.push(identity.country);

  if (addressLines.length > 0) {
    contactFields.push({
      type: "text",
      id: "identity.address",
      label: "Address",
      value: addressLines.join("\n"),
      displayValue: addressLines.join(", "),
      icon: Icon.Map,
    });
  }

  if (contactFields.length > 0) sections.push({ title: "Contact Information", fields: contactFields });

  return sections;
}

/**
 * Builds a single "Card" field section for a payment card vault item.
 *
 * Fields included (when present): cardholder name, brand, card number (hidden),
 * expiry month, expiry year, and security code (hidden).
 *
 * @param card - The card data from the vault item.
 * @returns A single-element array containing the "Card" section, or an empty array
 *          if the card is falsy or has no populated fields.
 */
function buildCardSections(card: Card): FieldSection[] {
  if (!card) return [];
  const fields: ItemField[] = [];

  const add = (type: "text" | "hidden", id: string, label: string, value: string | null, icon?: Icon) => {
    if (value) fields.push({ type, id, label, value, icon });
  };

  add("text", "card.cardholderName", "Cardholder Name", card.cardholderName, Icon.Person);
  add("text", "card.brand", "Brand", card.brand, Icon.Building);
  add("hidden", "card.number", "Number", card.number, Icon.CreditCard);
  add("text", "card.expMonth", "Expiry Month", card.expMonth, Icon.Calendar);
  add("text", "card.expYear", "Expiry Year", card.expYear, Icon.Calendar);
  add("hidden", "card.code", "Security Code", card.code, Icon.Lock);

  if (fields.length === 0) return [];
  return [{ title: "Card", fields }];
}

/**
 * Builds a single "SSH Key" field section containing the public key, key
 * fingerprint, and private key (hidden) fields.
 *
 * @param sshKey - The SSH key data from the vault item.
 * @returns A single-element array containing the "SSH Key" section, or an empty
 *          array if {@link sshKey} is falsy.
 */
function buildSshKeySections(sshKey: SshKey): FieldSection[] {
  if (!sshKey) return [];
  return [
    {
      title: "SSH Key",
      fields: [
        { type: "text", id: "ssh.publicKey", label: "Public Key", value: sshKey.publicKey, icon: Icon.Key },
        {
          type: "text",
          id: "ssh.fingerprint",
          label: "Key Fingerprint",
          value: sshKey.keyFingerprint,
          icon: Icon.Fingerprint,
        },
        { type: "hidden", id: "ssh.privateKey", label: "Private Key", value: sshKey.privateKey },
      ],
    },
  ];
}

/**
 * Converts Bitwarden custom fields into a single "Custom Fields" section.
 *
 * - Fields of type {@link FieldType.LINKED} are excluded (they are resolved
 *   server-side and have no standalone value).
 * - Fields with a `null` value are excluded.
 * - {@link FieldType.HIDDEN} fields render as masked/revealable rows.
 * - {@link FieldType.BOOLEAN} fields display "Yes" / "No" with a matching icon.
 * - All other types render as plain text.
 *
 * @param fields - The custom `fields` array from the vault item.
 * @returns A single-element array containing the "Custom Fields" section, or an
 *          empty array if no displayable fields remain after filtering.
 */
function buildCustomFieldSections(fields: Field[]): FieldSection[] {
  const entries: ItemField[] = fields
    .filter((f) => f.type !== FieldType.LINKED && f.value != null)
    .map((f, i) => ({
      type: f.type === FieldType.HIDDEN ? "hidden" : "text",
      id: `custom.${i}.${f.name}`,
      label: f.name || "Unnamed Field",
      value: f.type === FieldType.BOOLEAN ? (f.value === "true" ? "Yes" : "No") : f.value,
      icon: f.type === FieldType.BOOLEAN ? (f.value === "true" ? Icon.CheckCircle : Icon.Circle) : undefined,
    }));

  if (entries.length === 0) return [];
  return [{ title: "Custom Fields", fields: entries }];
}

/**
 * Wraps a vault item's notes string into a single "Notes" field section.
 *
 * @param notes - The free-form notes text from the vault item, or `null` if absent.
 * @returns A single-element array containing the "Notes" section, or an empty
 *          array when {@link notes} is `null` or empty.
 */
function buildNoteSection(notes: string | null): FieldSection[] {
  if (!notes) return [];
  return [
    {
      title: "Notes",
      fields: [
        {
          type: "text",
          id: "notes",
          label: "Notes",
          value: notes,
          icon: Icon.Document,
        },
      ],
    },
  ];
}

/**
 * Converts a vault item into an ordered array of {@link FieldSection}s ready
 * for rendering in the detail list view.
 *
 * Section ordering follows a consistent pattern per item type:
 * 1. Type-specific sections (login credentials, card details, identity info, SSH keys).
 * 2. Notes section (if present).
 * 3. Custom fields section (if any exist).
 *
 * @param item - The full Bitwarden vault item to transform.
 * @returns An ordered array of sections. May be empty if the item carries no
 *          displayable data (e.g. a login with no username, password, URIs, notes,
 *          or custom fields).
 */
export function buildFieldSections(item: Item): FieldSection[] {
  const sections: FieldSection[] = [];

  switch (item.type) {
    case ItemType.LOGIN:
      sections.push(...buildLoginSections(item.login!));
      break;

    case ItemType.CARD:
      sections.push(...buildCardSections(item.card!));
      break;

    case ItemType.IDENTITY:
      sections.push(...buildIdentitySections(item.identity!));
      break;

    case ItemType.SSH_KEY:
      sections.push(...buildSshKeySections(item.sshKey!));
      break;
  }

  sections.push(...buildNoteSection(item.notes));
  if (item.fields?.length) sections.push(...buildCustomFieldSections(item.fields));

  return sections;
}
