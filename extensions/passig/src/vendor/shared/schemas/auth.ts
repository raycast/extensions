// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
import { z } from "zod";
import { Base64Url, Email, EncryptedBlob, IsoDate, KdfParams, Uuid } from "./common.js";

export const UserRole = z.enum(["user", "admin"]);
export const UserStatus = z.enum(["active", "blocked"]);

export const PreloginRequest = z.object({ email: Email });
export const PreloginResponse = z.object({
  kdfSalt: Base64Url, // 16 byte
  kdfParams: KdfParams,
});

/** 32 byte in base64url senza padding = 43 caratteri (authKey, publicKey X25519). */
export const Base64Url32 = Base64Url.length(43, "attesi 32 byte in base64url");
/** 16 byte in base64url senza padding = 22 caratteri (kdfSalt). */
export const Base64Url16 = Base64Url.length(22, "attesi 16 byte in base64url");

export const RegisterRequest = z.object({
  email: Email,
  name: z.string().trim().min(1).max(120),
  authKey: Base64Url32, // 32 byte derivati dalla master password (subkey 1)
  kdfSalt: Base64Url16,
  kdfParams: KdfParams,
  publicKey: Base64Url32, // X25519 32 byte
  encryptedUserKey: EncryptedBlob, // userKey cifrata con stretchKey
  encryptedPrivateKey: EncryptedBlob, // privateKey cifrata con userKey
  inviteToken: z.string().min(16).max(128).optional(),
});

export const UserSelf = z.object({
  id: Uuid,
  email: Email,
  name: z.string(),
  role: UserRole,
  status: UserStatus,
  publicKey: Base64Url,
  encryptedUserKey: EncryptedBlob,
  encryptedPrivateKey: EncryptedBlob,
  kdfSalt: Base64Url,
  kdfParams: KdfParams,
  createdAt: IsoDate,
});
export type UserSelf = z.infer<typeof UserSelf>;

export const LoginRequest = z.object({
  email: Email,
  authKey: Base64Url32,
  deviceName: z.string().trim().min(1).max(120).default("unknown"),
});

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresIn: z.number().int(), // secondi
});

export const LoginResponse = TokenPair.extend({ user: UserSelf });

export const RefreshRequest = z.object({ refreshToken: z.string().min(16) });
export const LogoutRequest = z.object({ refreshToken: z.string().min(16).optional() });

export const ChangePasswordRequest = z.object({
  currentAuthKey: Base64Url32,
  newAuthKey: Base64Url32,
  newKdfSalt: Base64Url16,
  newKdfParams: KdfParams,
  newEncryptedUserKey: EncryptedBlob,
});

export const SessionInfo = z.object({
  id: Uuid,
  deviceName: z.string(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: IsoDate,
  lastUsedAt: IsoDate,
  current: z.boolean(),
});

export const UserLookupQuery = z.object({ email: Email });
export const UserPublic = z.object({
  id: Uuid,
  email: Email,
  name: z.string(),
  publicKey: Base64Url,
});
export type UserPublic = z.infer<typeof UserPublic>;

/** Payload del JWT di accesso */
export const AccessTokenClaims = z.object({
  sub: Uuid,
  sid: Uuid, // session id
  role: UserRole,
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaims>;
