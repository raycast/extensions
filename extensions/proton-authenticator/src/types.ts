export interface ProtonEntry {
  id: string;
  content: {
    uri: string;
    entry_type: string;
    name: string;
  };
  note: string | null;
}

export interface ProtonExport {
  version: string;
  entries: ProtonEntry[];
}

export interface TOTPAccount {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  period: number;
  digits: number;
  algorithm: string;
}

export type ImportMode = "json" | "sqlite";

export interface DecryptedAuthenticatorEntry {
  metadata: {
    name: string;
    note: string;
    id: string;
  };
  content: {
    totp?: { uri: string };
    steam?: { secret: string };
  };
}
