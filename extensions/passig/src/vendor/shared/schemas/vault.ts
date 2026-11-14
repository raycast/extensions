// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
import { z } from "zod";
import { Email, EncryptedBlob, IsoDate, SealedBlob, Uuid } from "./common.js";

export const VaultRole = z.enum(["owner", "editor", "reader"]);
export type VaultRole = z.infer<typeof VaultRole>;

export const Vault = z.object({
  id: Uuid,
  name: z.string(),
  organizationId: Uuid.nullable(),
  role: VaultRole, // il ruolo dell'utente corrente
  encryptedVaultKey: SealedBlob, // vaultKey sigillata con la publicKey dell'utente corrente
  itemCount: z.number().int(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Vault = z.infer<typeof Vault>;

export const CreateVaultRequest = z.object({
  name: z.string().trim().min(1).max(120),
  organizationId: Uuid.optional(),
  encryptedVaultKey: SealedBlob,
});
export const UpdateVaultRequest = z.object({ name: z.string().trim().min(1).max(120) });

export const VaultMember = z.object({
  userId: Uuid,
  email: Email,
  name: z.string(),
  role: VaultRole,
  publicKey: z.string(),
  createdAt: IsoDate,
});
export const AddVaultMemberRequest = z.object({
  userId: Uuid,
  role: VaultRole,
  encryptedVaultKey: SealedBlob,
});
export const UpdateVaultMemberRequest = z.object({ role: VaultRole });

/** Rotazione della vaultKey dopo la revoca di un membro: tutto in una transazione */
export const RotateVaultRequest = z.object({
  items: z.array(z.object({ id: Uuid, data: EncryptedBlob, version: z.number().int() })).max(5000),
  members: z.array(z.object({ userId: Uuid, encryptedVaultKey: SealedBlob })).min(1).max(500),
});

// ---------- Item ----------

export const ItemType = z.enum(["login", "note", "card", "identity"]);

export const CustomField = z.object({
  name: z.string().max(100),
  value: z.string().max(10_000),
  hidden: z.boolean().default(false),
});

/** Contenuto in chiaro di un item: ESISTE SOLO SUL CLIENT. Viene cifrato con la vaultKey. */
export const ItemData = z.object({
  v: z.literal(1),
  type: ItemType,
  title: z.string().max(200),
  username: z.string().max(500).default(""),
  password: z.string().max(5000).default(""),
  urls: z.array(z.string().max(2000)).default([]),
  notes: z.string().max(50_000).default(""),
  totp: z.string().max(2000).optional(),
  fields: z.array(CustomField).default([]),
  favorite: z.boolean().default(false),
  passwordHistory: z
    .array(z.object({ password: z.string(), changedAt: IsoDate }))
    .max(20)
    .default([]),
});
export type ItemData = z.infer<typeof ItemData>;

export const Item = z.object({
  id: Uuid,
  vaultId: Uuid,
  data: EncryptedBlob,
  version: z.number().int(),
  createdBy: Uuid,
  updatedBy: Uuid,
  createdAt: IsoDate,
  updatedAt: IsoDate,
  deletedAt: IsoDate.nullable(),
});
export type Item = z.infer<typeof Item>;

export const CreateItemRequest = z.object({ data: EncryptedBlob });

/** Limite di item per singola chiamata bulk (import): i client spezzano in blocchi. */
export const BULK_ITEMS_MAX = 500;
/** Dimensione massima del body di una chiamata bulk (byte). */
export const BULK_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

/** Creazione massiva (import da altri password manager): tutto o niente, in una transazione. */
export const CreateItemsBulkRequest = z.object({
  items: z.array(z.object({ data: EncryptedBlob })).min(1).max(BULK_ITEMS_MAX),
});
export const CreateItemsBulkResponse = z.object({ items: z.array(Item) });
export const UpdateItemRequest = z.object({ data: EncryptedBlob, version: z.number().int() });
export const ListItemsQuery = z.object({
  since: IsoDate.optional(),
  includeDeleted: z
    .union([z.boolean(), z.enum(["0", "1", "true", "false"])])
    .default(false)
    .transform((v) => v === true || v === "1" || v === "true"),
});
