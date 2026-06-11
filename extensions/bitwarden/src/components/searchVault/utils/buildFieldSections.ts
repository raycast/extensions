import { Icon } from "@raycast/api";
import { Card, Field, FieldType, Identity, Item, ItemType, Login, SshKey } from "~/types/vault";
import { FieldSection, ItemField } from "../types/item-field";

function buildLoginSections(login: Login): FieldSection[] {
  const sections: FieldSection[] = [];
  const mainLoginFields: ItemField[] = [];

  if (login.password) {
    mainLoginFields.push({
      type: "hidden",
      id: "login.password",
      label: "Password",
      value: login.password,
    });
  }
  if (login.username) {
    mainLoginFields.push({
      type: "text",
      id: "login.username",
      label: "Username",
      value: login.username,
      icon: Icon.PersonCircle,
    });
  }
  if (login.totp) {
    mainLoginFields.push({
      type: "totp",
      id: "login.totp",
      label: "TOTP",
      secretLabel: "TOTP Secret",
      value: login.totp,
      icon: Icon.Clock,
    });
  }

  if (mainLoginFields.length > 0) sections.push({ title: "Login", fields: mainLoginFields });

  if (login.uris && login.uris.length > 0) {
    const nonEmptyUris = login.uris.filter((u) => u.uri);
    const uriFields: ItemField[] = nonEmptyUris.map((u, i) => ({
      type: "link",
      id: `login.uri.${i}`,
      label: nonEmptyUris.length === 1 ? "URI" : `URI ${i + 1}`,
      value: u.uri!,
    }));
    if (uriFields.length > 0) sections.push({ title: "URIs", fields: uriFields });
  }

  return sections;
}

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

export function buildFieldSections(item: Item): FieldSection[] {
  const sections: FieldSection[] = [];

  switch (item.type) {
    case ItemType.LOGIN:
      if (item.login) {
        sections.push(...buildLoginSections(item.login));
      }
      break;

    case ItemType.CARD:
      if (item.card) {
        sections.push(...buildCardSections(item.card));
      }
      break;

    case ItemType.IDENTITY:
      if (item.identity) {
        sections.push(...buildIdentitySections(item.identity));
      }
      break;

    case ItemType.SSH_KEY:
      if (item.sshKey) {
        sections.push(...buildSshKeySections(item.sshKey));
      }
      break;
  }

  sections.push(...buildNoteSection(item.notes));
  if (item.fields?.length) sections.push(...buildCustomFieldSections(item.fields));

  return sections;
}
