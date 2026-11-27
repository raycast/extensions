import {
  fieldsOf,
  formatAddress,
  formatExpirationDate,
  formatFieldDate,
  formatWifiSecurity,
  lastDigitsOf,
} from "./item-fields";
import { Folder, Item, ItemDetail, ItemType, PassCliError, Vault, VaultRole } from "./types";

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * A secret as saved: a password, a hidden field, a card's number. Spaces at its ends are part of it, so it's never
 * trimmed, and only an empty string counts as missing.
 */
function exactOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeVaultRole(value: unknown): VaultRole | undefined {
  const raw = trimOrUndefined(value)?.toLowerCase();
  switch (raw) {
    case "owner":
    case "manager":
    case "editor":
    case "viewer":
      return raw;
    default:
      return undefined;
  }
}

export function normalizeVault(raw: unknown): Vault {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected vault data from pass-cli.", "invalid_output");
  }

  const shareId = trimOrUndefined(raw.share_id ?? raw.shareId ?? raw.shareID ?? raw.id);
  const name = trimOrUndefined(raw.name);
  const itemCountValue = raw.itemCount ?? raw.item_count ?? raw.items_count ?? raw.itemsCount;
  const itemCount =
    itemCountValue === undefined
      ? undefined
      : typeof itemCountValue === "number"
        ? itemCountValue
        : Number(itemCountValue);
  const role = normalizeVaultRole(raw.role);

  if (!shareId || !name) {
    throw new PassCliError("Unexpected vault data from pass-cli.", "invalid_output");
  }

  return {
    shareId,
    name,
    itemCount: itemCount !== undefined && Number.isFinite(itemCount) ? itemCount : undefined,
    role,
  };
}

/** The user's role on each share, by share ID, from `share list`. Custom roles, printed as objects, are left out. */
export function normalizeShareRoles(rawShares: unknown[]): Map<string, VaultRole> {
  const roles = new Map<string, VaultRole>();
  for (const raw of rawShares) {
    if (!isRecord(raw)) continue;
    const shareId = trimOrUndefined(raw.id ?? raw.share_id);
    const role = normalizeVaultRole(raw.share_role ?? raw.role);
    if (shareId && role) roles.set(shareId, role);
  }
  return roles;
}

/** pass-cli prints timestamps without a zone ("2025-06-01T12:34:56"), which are treated as UTC. Unix seconds are accepted too. */
function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }
  const raw = trimOrUndefined(value);
  if (!raw) return undefined;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const time = Date.parse(hasZone ? raw : `${raw}Z`);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

/** The key of each item type in an item's content, as pass-cli prints it, with the older spellings. */
const TYPE_KEYS: [string, ItemType][] = [
  ["Note", "note"],
  ["CreditCard", "credit_card"],
  ["credit_card", "credit_card"],
  ["Identity", "identity"],
  ["Alias", "alias"],
  ["SshKey", "ssh_key"],
  ["ssh_key", "ssh_key"],
  ["Wifi", "wifi"],
  ["Custom", "custom"],
];

function getItemTypeFromContent(contentData: unknown): {
  type: ItemType;
  loginData: Record<string, unknown> | undefined;
} {
  if (!isRecord(contentData)) {
    return { type: "note", loginData: undefined };
  }

  if (isRecord(contentData.Login)) {
    return { type: "login", loginData: contentData.Login as Record<string, unknown> };
  }
  // Notes and aliases hold nothing there: pass-cli prints `{"Note": null}` and `{"Alias": null}`.
  for (const [key, type] of TYPE_KEYS) {
    if (key in contentData && contentData[key] !== undefined) return { type, loginData: undefined };
  }

  return { type: "note", loginData: undefined };
}

const ITEM_TYPES: readonly ItemType[] = [
  "login",
  "note",
  "credit_card",
  "identity",
  "alias",
  "ssh_key",
  "wifi",
  "custom",
];

/** The `item_type` of an item listed without its contents, e.g. "credit_card". */
function summaryTypeOf(value: unknown): ItemType | undefined {
  return ITEM_TYPES.find((type) => type === value);
}

/**
 * What tells an item that isn't a login apart, shown next to its name: a card's last 4 digits, an alias's address, a Wi-Fi
 * network's name, an identity's full name or email. Never a secret: `Item` gets cached. Notes, SSH keys and custom items
 * have none, their content being secret or long.
 */
function summaryOf(type: ItemType, raw: Record<string, unknown>): string | undefined {
  const data = getTypeSpecificData(raw);
  switch (type) {
    case "credit_card": {
      const lastDigits = typeof data?.number === "string" ? lastDigitsOf(data.number) : undefined;
      return lastDigits ? `•••• ${lastDigits}` : undefined;
    }
    case "alias":
      return trimOrUndefined(raw.alias_email ?? raw.aliasEmail);
    case "wifi":
      return trimOrUndefined(data?.ssid);
    case "identity":
      return trimOrUndefined(data?.full_name) ?? trimOrUndefined(data?.email);
    default:
      return undefined;
  }
}

/**
 * The otpauth URI of a listed login: its TOTP secret. Kept apart from `Item`, which gets cached, so that it's only ever
 * held in memory.
 */
export function totpUriOf(raw: unknown): string | undefined {
  if (!isRecord(raw)) return undefined;
  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const { loginData } = getItemTypeFromContent(isRecord(outerContent.content) ? outerContent.content : undefined);
  return loginData ? trimOrUndefined(loginData.totp_uri ?? loginData.totpUri) : undefined;
}

export function normalizeItem(raw: unknown, vaultNameOverride?: string, vaultShareIdOverride?: string): Item {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected item data from pass-cli.", "invalid_output");
  }

  const shareId =
    trimOrUndefined(raw.share_id ?? raw.shareId ?? raw.shareID ?? raw.vaultShareId ?? raw.vault_share_id) ??
    vaultShareIdOverride;
  const itemId = trimOrUndefined(raw.id ?? raw.itemId ?? raw.item_id ?? raw.itemID);

  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const title = trimOrUndefined(outerContent.title ?? raw.title ?? raw.name);

  const innerContent = isRecord(outerContent.content) ? outerContent.content : undefined;
  const fromContent = getItemTypeFromContent(innerContent);
  const { loginData } = fromContent;
  // Listed without its contents, e.g. in a vault whose policy hides them, an item only says its type.
  const type = innerContent ? fromContent.type : (summaryTypeOf(raw.item_type) ?? fromContent.type);

  const username = loginData ? trimOrUndefined(loginData.username) : trimOrUndefined(raw.username);
  const email = loginData ? trimOrUndefined(loginData.email) : trimOrUndefined(raw.email);
  const urls = loginData ? normalizeUrls(loginData.urls) : undefined;

  const totpUri = loginData ? trimOrUndefined(loginData.totp_uri ?? loginData.totpUri) : undefined;
  const hasTotp = totpUri !== undefined && totpUri.length > 0;
  const hasPassword = loginData ? exactOrUndefined(loginData.password) !== undefined : undefined;
  const modifiedAt = normalizeTimestamp(raw.modify_time ?? raw.modifyTime ?? raw.modified_at);
  const createdAt = normalizeTimestamp(raw.create_time ?? raw.createTime ?? raw.created_at);
  const hasNote = trimOrUndefined(outerContent.note ?? raw.note) !== undefined;
  const folderId = trimOrUndefined(raw.folder_id ?? raw.folderId);
  const summary = summaryOf(type, raw);

  const vaultName = vaultNameOverride ?? trimOrUndefined(raw.vaultName ?? raw.vault_name) ?? "Unknown Vault";

  if (!shareId || !itemId || !title) {
    throw new PassCliError("Unexpected item data from pass-cli.", "invalid_output");
  }

  return {
    shareId,
    itemId,
    title,
    type,
    vaultName,
    urls,
    username,
    email,
    hasTotp,
    hasPassword,
    modifiedAt,
    createdAt,
    hasNote,
    folderId,
    ...(summary ? { summary } : {}),
  };
}

/** A folder from `pass-cli folder list --output json`: its ID, its name in `content`, and its parent folder's ID. */
export function normalizeFolder(raw: unknown): Folder {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected folder data from pass-cli.", "invalid_output");
  }
  const folderId = trimOrUndefined(raw.id ?? raw.folder_id);
  const name = trimOrUndefined(isRecord(raw.content) ? raw.content.name : (raw.name ?? raw.folder_name));
  if (!folderId || !name) {
    throw new PassCliError("Unexpected folder data from pass-cli.", "invalid_output");
  }
  return { folderId, name, parentId: trimOrUndefined(raw.parent_folder_id ?? raw.parent_id) };
}

type CustomField = NonNullable<ItemDetail["customFields"]>[number];

/**
 * A custom field as pass-cli 2.5 prints it, `{"name": "PIN", "content": {"Hidden": "1234"}}`, or as `{name, value, type}`
 * like earlier versions. Empty fields are left out.
 */
function normalizeCustomField(field: unknown, section?: string): CustomField | undefined {
  if (!isRecord(field)) return undefined;
  const name = trimOrUndefined(field.name ?? field.key);
  if (!name) return undefined;

  if (isRecord(field.content)) {
    const { Text, Hidden, Totp, Timestamp } = field.content;
    let value: string | undefined;
    let type: CustomField["type"] = "text";
    if (Text !== undefined) value = trimOrUndefined(Text);
    else if (Hidden !== undefined) [value, type] = [exactOrUndefined(Hidden), "hidden"];
    else if (Totp !== undefined) [value, type] = [exactOrUndefined(Totp), "totp"];
    else if (typeof Timestamp === "number") [value, type] = [formatFieldDate(Timestamp), "date"];
    return value === undefined ? undefined : { name, value, type, ...(section ? { section } : {}) };
  }

  const type = trimOrUndefined(field.type)?.toLowerCase() === "text" ? "text" : "hidden";
  const value = type === "text" ? trimOrUndefined(field.value) : exactOrUndefined(field.value);
  return value === undefined ? undefined : { name, value, type, ...(section ? { section } : {}) };
}

function normalizeCustomFields(raw: unknown, section?: string): CustomField[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const mapped = raw
    .map((field) => normalizeCustomField(field, section))
    .filter((field): field is CustomField => field !== undefined);
  return mapped.length > 0 ? mapped : undefined;
}

/** The fields of an item's sections, `[{"section_name": "Server", "section_fields": [...]}]`, each with its section. */
function normalizeSections(raw: unknown): CustomField[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((section) => {
    if (!isRecord(section)) return [];
    const name = trimOrUndefined(section.section_name ?? section.name);
    return normalizeCustomFields(section.section_fields ?? section.fields, name) ?? [];
  });
}

function normalizeUrls(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const values = raw
    .map((entry) => {
      if (typeof entry === "string") return trimOrUndefined(entry);
      if (!isRecord(entry)) return undefined;
      return trimOrUndefined(entry.url ?? entry.href ?? entry.value ?? entry.link);
    })
    .filter((value): value is string => Boolean(value));

  return values.length > 0 ? values : undefined;
}

function getTypeSpecificData(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const innerContent = isRecord(outerContent.content) ? outerContent.content : undefined;

  if (!innerContent) return undefined;

  for (const key of ["Login", ...TYPE_KEYS.map(([typeKey]) => typeKey)]) {
    if (isRecord(innerContent[key])) {
      return innerContent[key] as Record<string, unknown>;
    }
  }

  return undefined;
}

/** pass-cli's key for each field of item-fields.ts, by the field's ID. */
const RAW_FIELD_KEYS: Partial<Record<ItemType, Record<string, string>>> = {
  credit_card: {
    cardholderName: "cardholder_name",
    cardNumber: "number",
    expirationDate: "expiration_date",
    securityCode: "verification_number",
    pin: "pin",
  },
  identity: {
    fullName: "full_name",
    identityEmail: "email",
    phoneNumber: "phone_number",
    firstName: "first_name",
    middleName: "middle_name",
    lastName: "last_name",
    birthdate: "birthdate",
    gender: "gender",
    organization: "organization",
    streetAddress: "street_address",
    floor: "floor",
    zipOrPostalCode: "zip_or_postal_code",
    city: "city",
    stateOrProvince: "state_or_province",
    county: "county",
    countryOrRegion: "country_or_region",
    socialSecurityNumber: "social_security_number",
    passportNumber: "passport_number",
    licenseNumber: "license_number",
    identityWebsite: "website",
    xHandle: "x_handle",
    secondPhoneNumber: "second_phone_number",
    linkedin: "linkedin",
    reddit: "reddit",
    facebook: "facebook",
    yahoo: "yahoo",
    instagram: "instagram",
    company: "company",
    jobTitle: "job_title",
    personalWebsite: "personal_website",
    workPhoneNumber: "work_phone_number",
    workEmail: "work_email",
  },
  ssh_key: { publicKey: "public_key", privateKey: "private_key" },
  wifi: { ssid: "ssid", wifiPassword: "password", security: "security" },
};

/** The groups of extra fields an identity can have, with the title Proton Pass gives them. */
const IDENTITY_EXTRA_GROUPS: [string, string][] = [
  ["extra_personal_details", "Personal Details"],
  ["extra_address_details", "Address Details"],
  ["extra_contact_details", "Contact Details"],
  ["extra_work_details", "Work Details"],
];

/** The filled fields of a card, identity, alias, SSH key or Wi-Fi network, by their ID in item-fields.ts. */
function normalizeTypeFields(
  type: ItemType,
  typeData: Record<string, unknown> | undefined,
  raw: Record<string, unknown>,
): Record<string, string> | undefined {
  const fields: Record<string, string> = {};
  const secrets = new Set(
    fieldsOf(type)
      .filter((spec) => spec.secret)
      .map((spec) => spec.id),
  );
  for (const [id, key] of Object.entries(RAW_FIELD_KEYS[type] ?? {})) {
    const read = secrets.has(id) ? exactOrUndefined : trimOrUndefined;
    const value = typeData ? read(typeData[key]) : undefined;
    if (value !== undefined) fields[id] = value;
  }

  if (fields.expirationDate) fields.expirationDate = formatExpirationDate(fields.expirationDate);
  if (fields.security) {
    const security = formatWifiSecurity(fields.security);
    if (security) fields.security = security;
    else delete fields.security;
  }
  if (type === "identity") {
    const address = formatAddress(fields);
    if (address) fields.address = address;
  }
  if (type === "alias") {
    // The alias's address isn't in its content: pass-cli prints it beside, as the alias_email of the item.
    const aliasAddress = trimOrUndefined(raw.alias_email ?? raw.aliasEmail);
    if (aliasAddress) fields.aliasAddress = aliasAddress;
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

/** Fields an item keeps in sections or groups: those of SSH keys, Wi-Fi networks and custom items, and an identity's extras. */
function sectionFieldsOf(type: ItemType, typeData: Record<string, unknown> | undefined): CustomField[] {
  if (!typeData) return [];
  if (type === "identity") {
    return [
      ...IDENTITY_EXTRA_GROUPS.flatMap(([key, title]) => normalizeCustomFields(typeData[key], title) ?? []),
      ...normalizeSections(typeData.extra_sections),
    ];
  }
  return normalizeSections(typeData.sections);
}

export function normalizeItemDetail(
  raw: unknown,
  vaultNameOverride?: string,
  vaultShareIdOverride?: string,
): ItemDetail {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected item details from pass-cli.", "invalid_output");
  }

  const base = normalizeItem(raw, vaultNameOverride, vaultShareIdOverride);

  const outerContent = isRecord(raw.content) ? raw.content : raw;
  const typeData = getTypeSpecificData(raw);
  // A Wi-Fi network's password is one of its fields: Copy Password and the rows of logins only take a login's.
  const loginData = base.type === "login" ? typeData : undefined;

  const password = loginData ? exactOrUndefined(loginData.password) : undefined;
  const totpUri = loginData ? trimOrUndefined(loginData.totp_uri ?? loginData.totpUri) : undefined;

  const urls = loginData ? normalizeUrls(loginData.urls) : undefined;

  const note = trimOrUndefined(outerContent.note ?? raw.note);

  const extraFields =
    normalizeCustomFields(outerContent.extra_fields) ??
    normalizeCustomFields(outerContent.extraFields) ??
    normalizeCustomFields(raw.extra_fields) ??
    normalizeCustomFields(raw.extraFields) ??
    [];
  // The fields that are in no section come first, as in Proton Pass.
  const allCustomFields = [...extraFields, ...sectionFieldsOf(base.type, typeData)];
  const customFields = allCustomFields.length > 0 ? allCustomFields : undefined;

  return {
    ...base,
    password,
    urls,
    note,
    customFields,
    totpUri,
    fields: normalizeTypeFields(base.type, typeData, raw),
  };
}
