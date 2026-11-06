export interface VaultItem {
  id: string;
  title: string;
  subtitle?: string;
  username?: string;
  email?: string;
  url?: string;
  hasTotp?: boolean;
  managerId: string;
}

export interface ItemAvailability {
  hasUrl: boolean;
  url?: string;
  hasEmail: boolean;
  hasUsername: boolean;
  hasTotp: boolean;
  hasPassword: boolean;
}

export type AdapterStatus = { ok: true } | { ok: false; reason: string; needsAuth?: boolean };

export type AuthFieldType = "password" | "pin" | "text";

export interface AuthField {
  id: string;
  label: string;
  type: AuthFieldType;
}

export interface AuthRequirements {
  fields: AuthField[];
}

export type ExternalAdapterMode = "one-shot" | "persistent";

export interface ExternalAdapterManifestFile {
  id: string;
  name: string;
  command: string;
  capabilities?: string[];
  env?: Record<string, string>;
  mode?: ExternalAdapterMode;
}

export interface ExternalAdapterManifest extends ExternalAdapterManifestFile {
  workingDirectory: string;
  executable: string;
  args: string[];
}

export interface PasswordManagerAdapter {
  readonly id: string;
  readonly name: string;
  readonly cliBinary: string;
  readonly kind?: "builtin" | "external";

  isAvailable(): Promise<AdapterStatus>;

  /** Full item list for local filtering. UI caches this per session when implemented. */
  listItems?(): Promise<VaultItem[]>;

  searchItems(query: string): Promise<VaultItem[]>;

  getPassword(item: VaultItem): Promise<string>;
  getUsername(item: VaultItem): Promise<string | undefined>;
  getEmail(item: VaultItem): Promise<string | undefined>;
  getTotp(item: VaultItem): Promise<string | undefined>;

  getUrl?(item: VaultItem): Promise<string | undefined>;
  openInManager?(item: VaultItem): Promise<void>;
  getItemAvailability?(item: VaultItem): Promise<ItemAvailability>;

  getAuthRequirements?(): AuthRequirements | Promise<AuthRequirements>;
  authenticate?(credentials: Record<string, string>): Promise<AdapterStatus>;
}

export interface CliRunOptions {
  args?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface CliPathOverrides {
  [adapterId: string]: string;
}
