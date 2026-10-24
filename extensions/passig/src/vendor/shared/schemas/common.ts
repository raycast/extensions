// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
import { z } from "zod";

/** base64url senza padding */
export const Base64Url = z.string().regex(/^[A-Za-z0-9_-]+$/, "base64url atteso");

/** `v1.<nonce>.<ciphertext>` — XChaCha20-Poly1305 */
export const EncryptedBlob = z
  .string()
  .regex(/^v1\.[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]+$/, "EncryptedBlob v1 atteso")
  .max(1_000_000);

/** `s1.<sealedbox>` — crypto_box_seal */
export const SealedBlob = z
  .string()
  .regex(/^s1\.[A-Za-z0-9_-]+$/, "SealedBlob s1 atteso")
  .max(4096);

export const Uuid = z.string().uuid();
export const Email = z.string().trim().toLowerCase().email().max(254);
export const IsoDate = z.string().datetime({ offset: true });

export const KdfParams = z.object({
  algorithm: z.literal("argon2id13"),
  opsLimit: z.number().int().min(3).max(20), // minimo = default: il server rifiuta KDF più deboli
  memLimitBytes: z.number().int().min(64 * 1024 * 1024).max(1024 * 1024 * 1024),
});
export type KdfParams = z.infer<typeof KdfParams>;

export const DEFAULT_KDF_PARAMS: KdfParams = {
  algorithm: "argon2id13",
  opsLimit: 3,
  memLimitBytes: 64 * 1024 * 1024,
};

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });

export const OkResponse = z.object({ ok: z.literal(true) });
