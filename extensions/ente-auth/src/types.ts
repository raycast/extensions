// src/types.ts
export interface AuthKey {
  userID: number;
  encryptedKey: string;
  header: string;
}

export interface AuthEntity {
  id: string;
  encryptedData: string | null;
  header: string | null;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AuthData {
  id: string;
  name: string;
  issuer?: string;
  secret: string;
  type: "totp" | "hotp" | "steam";
  algorithm: "sha1" | "sha256" | "sha512";
  digits: number;
  period: number;
  counter?: number;
  updatedAt: number;
  codeDisplay?: {
    trashed?: boolean;
    pinned?: boolean;
    iconSrc?: string;
    iconID?: string;
  }; // Metadata from Ente Auth
}

export interface AuthCode extends AuthData {
  code: string;
  remainingSeconds?: number;
  progress?: number;
}

export interface UserCredentials {
  email: string;
  userId: number; // [+] Add user ID from login response
  token: string;
  masterKey: Buffer; // [+] Changed from Uint8Array to Buffer for consistency with Node.js crypto
  keyAttributes: KeyAttributes;
}

export interface KeyAttributes {
  kekSalt: string;
  encryptedKey: string;
  keyDecryptionNonce: string;
  publicKey: string;
  encryptedSecretKey: string;
  secretKeyDecryptionNonce: string;
  memLimit: number;
  opsLimit: number;
}

export interface AuthorizationResponse {
  id: number;
  encryptedToken: string;
  token?: string;
  twoFactorSessionID?: string;
  keyAttributes: KeyAttributes;
}

export interface ApiClientConfig {
  token?: string;
  clientPackage: string;
  userId?: number;
  accountKey?: string;
}

export interface AuthenticationContext {
  userId: number;
  accountKey: string;
  userAgent: string;
}

export interface AuthenticatedHeaders {
  "Content-Type": string;
  "X-Auth-Token": string;
  "X-Client-Package": string;
  "User-Agent"?: string;
  "X-Request-Id"?: string;
}

// SRP Authentication Types
export interface SRPAttributes {
  srpUserID: string;
  srpSalt: string;
  memLimit: number;
  opsLimit: number;
  kekSalt: string;
  isEmailMFAEnabled: boolean;
}

export interface CreateSRPSessionResponse {
  sessionID: string;
  srpB: string;
}

export interface SRPVerificationResponse extends AuthorizationResponse {
  srpM2: string;
}
