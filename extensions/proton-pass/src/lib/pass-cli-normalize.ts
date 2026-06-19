import { Item, ItemDetail, ItemType, PassCliError, Vault, VaultRole } from "./types";

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeVaultRole(value: unknown): VaultRole {
  const raw = trimOrUndefined(value)?.toLowerCase();
  switch (raw) {
    case "owner":
    case "manager":
    case "editor":
    case "viewer":
      return raw;
    default:
      return "viewer";
  }
}

export function normalizeVault(raw: unknown): Vault {
  if (!isRecord(raw)) {
    throw new PassCliError("Unexpected vault data from pass-cli.", "invalid_output");
  }

  const shareId = trimOrUndefined(raw.share_id ?? raw.shareId ?? raw.shareID ?? raw.id);
  const name = trimOrUndefined(raw.name);
  const itemCountValue = raw.itemCount ?? raw.item_count ?? raw.items_count ?? raw.itemsCount;
  const itemCount = typeof itemCountValue === "number" ? itemCountValue : Number(itemCountValue ?? 0);
  const role = normalizeVaultRole(raw.role);

  if (!shareId || !name) {
    throw new PassCliError("Unexpected vault data from pass-cli.", "invalid_output");
  }

  return {
    shareId,
    name,
    itemCount: Number.isFinite(itemCount) ? itemCount : 0,
    role,
  };
}

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
  if (isRecord(contentData.Note) || contentData.Note !== undefined) {
    return { type: "note", loginData: undefined };
  }
  if (isRecord(contentData.CreditCard) || isRecord(contentData.credit_card)) {
    return { type: "credit_card", loginData: undefined };
  }
  if (isRecord(contentData.Identity)) {
    return { type: "identity", loginData: undefined };
  }
  if (isRecord(contentData.Alias)) {
    return { type: "alias", loginData: undefined };
  }
  if (isRecord(contentData.SshKey) || isRecord(contentData.ssh_key)) {
    return { type: "ssh_key", loginData: undefined };
  }
  if (isRecord(contentData.Wifi)) {
    return { type: "wifi", loginData: undefined };
  }

  return { type: "note", loginData: undefined };
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
  const { type, loginData } = getItemTypeFromContent(innerContent);

  const username = loginData ? trimOrUndefined(loginData.username) : trimOrUndefined(raw.username);
  const email = loginData ? trimOrUndefined(loginData.email) : trimOrUndefined(raw.email);
  const urls = loginData ? normalizeUrls(loginData.urls) : undefined;

  const totpUri = loginData ? trimOrUndefined(loginData.totp_uri ?? loginData.totpUri) : undefined;
  const hasTotp = totpUri !== undefined && totpUri.length > 0;

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
  };
}

function normalizeCustomFields(raw: unknown): ItemDetail["customFields"] {
  if (raw === undefined || raw === null) return undefined;

  const arr = Array.isArray(raw) ? raw : undefined;
  if (!arr) return undefined;

  const mapped = arr
    .map((field) => {
      if (!isRecord(field)) return undefined;
      const name = trimOrUndefined(field.name ?? field.key);
      const value = trimOrUndefined(field.value);
      const typeRaw = trimOrUndefined(field.type)?.toLowerCase();
      const type = typeRaw === "text" ? "text" : "hidden";
      if (!name || value === undefined) return undefined;
      return { name, value, type } as const;
    })
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  return mapped.length > 0 ? mapped : undefined;
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

  const typeKeys = ["Login", "Note", "CreditCard", "credit_card", "Identity", "Alias", "SshKey", "ssh_key", "Wifi"];
  for (const key of typeKeys) {
    if (isRecord(innerContent[key])) {
      return innerContent[key] as Record<string, unknown>;
    }
  }

  return undefined;
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

  const password = typeData ? trimOrUndefined(typeData.password) : undefined;

  const urls = typeData ? normalizeUrls(typeData.urls) : undefined;

  const note = trimOrUndefined(outerContent.note ?? raw.note);

  const customFields =
    normalizeCustomFields(outerContent.extra_fields) ??
    normalizeCustomFields(outerContent.extraFields) ??
    normalizeCustomFields(raw.extra_fields) ??
    normalizeCustomFields(raw.extraFields);

  return {
    ...base,
    password,
    urls,
    note,
    customFields,
  };
}
