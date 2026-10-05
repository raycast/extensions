export interface Entry {
  slug: string;
  password: string;
  metadata?: Record<string, string>;
  group?: string;
  username?: string;
  url?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  name: string;
  createdAt: number;
}

export interface Vault {
  version: number;
  groups: Group[];
  entries: Entry[];
}

export interface EncryptedVault {
  v: number;
  kdf: { algo: "scrypt"; N: number; r: number; p: number; salt: string };
  cipher: { algo: "aes-256-gcm"; iv: string; tag: string };
  data: string;
}
