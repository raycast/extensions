export const PROTON_PASS_CLI_DOCS = "https://protonpass.github.io/pass-cli/";

export type VaultRole = "owner" | "manager" | "editor" | "viewer";

export type ItemType = "login" | "note" | "credit_card" | "identity" | "alias" | "ssh_key" | "wifi" | "custom";

export type PasswordType = "random" | "passphrase";

export interface Vault {
  shareId: string;
  name: string;
  itemCount?: number;
  role?: VaultRole;
  /** Whether other people have access to the vault. */
  isShared?: boolean;
}

/** How a vault is shared: the user's role on it, and whether other people have access, when known. */
export interface VaultSharing {
  role: VaultRole;
  isShared?: boolean;
}

/** How each vault is shared, by share ID, as saved by the vault list. */
export type SavedSharing = Record<string, VaultSharing>;

export interface Item {
  shareId: string;
  itemId: string;
  title: string;
  type: ItemType;
  vaultName: string;
  urls?: string[];
  username?: string;
  email?: string;
  hasTotp: boolean;
  /** Whether a login has a password saved. The password itself is never part of `Item`, which gets cached. */
  hasPassword?: boolean;
  /** ISO 8601 date of the last modification. */
  modifiedAt?: string;
  /** ISO 8601 date of the creation. */
  createdAt?: string;
  /** Whether the item has a note. The note itself is never part of `Item`. */
  hasNote?: boolean;
  /** Shared with the user on its own: `shareId` is then that item's share, not a vault's. */
  sharedWithMe?: boolean;
  /**
   * What tells an item other than a login apart, shown next to its name: a card's last 4 digits ("•••• 4242"), an
   * alias's address, a Wi-Fi network's name, an identity's full name. Never a secret.
   */
  summary?: string;
  /** The folder of its vault the item is in, if any. */
  folderId?: string;
  /** The item's folder and the ones it's in, from the vault's root down, once their names are known. */
  folderPath?: FolderRef[];
}

/** A folder of a vault, as pass-cli lists it. */
export interface Folder {
  folderId: string;
  name: string;
  /** The folder it's in, if any. */
  parentId?: string;
}

export interface FolderRef {
  id: string;
  name: string;
}

export interface CustomField {
  name: string;
  /** A date field's value is its date, already formatted; a TOTP field's is its otpauth URI or secret. */
  value: string;
  type: "text" | "hidden" | "totp" | "date";
  /** The section of the item the field is in, if any: SSH keys, Wi-Fi networks, identities and custom items have some. */
  section?: string;
}

export interface ItemDetail extends Item {
  password?: string;
  urls?: string[];
  note?: string;
  customFields?: CustomField[];
  /** otpauth:// URI, kept in memory only so codes can be generated locally. */
  totpUri?: string;
  /** The filled fields of a card, identity, alias, SSH key or Wi-Fi network, by ID (see item-fields.ts). */
  fields?: Record<string, string>;
}

export interface PasswordOptions {
  type: PasswordType;
  length?: number;
  words?: number;
  includeNumbers?: boolean;
  includeUppercase?: boolean;
  includeSymbols?: boolean;
  separator?: string;
  capitalize?: boolean;
}

export interface PasswordScore {
  numericScore: number;
  passwordScore: string;
  penalties?: string[];
}

export type PassCliErrorType =
  | "unsupported_platform"
  | "not_installed"
  /** The pass-cli at CLI Path is older than the extension supports. */
  | "outdated_cli"
  /** CLI Path is a folder, or a file this user can't run. */
  | "unrunnable_cli"
  | "not_authenticated"
  | "network_error"
  | "keyring_error"
  /**
   * pass-cli refuses an item's contents as "not allowed by policy": since 2.7.1, for the vaults shared with a flag
   * that hides them (HideSensitiveContent).
   */
  | "hidden_by_policy"
  | "timeout"
  | "invalid_output"
  | "unknown";

/** pass-cli can't run as CLI Path is set: the extension preferences are where it's fixed. */
export type CliPathErrorType = "not_installed" | "outdated_cli" | "unrunnable_cli";

export class PassCliError extends Error {
  type: PassCliErrorType;

  static isCliPath(type: string | undefined): type is CliPathErrorType {
    return type === "not_installed" || type === "outdated_cli" || type === "unrunnable_cli";
  }

  constructor(message: string, type: PassCliErrorType) {
    super(message);
    this.name = "PassCliError";
    this.type = type;
    Object.setPrototypeOf(this, PassCliError.prototype);
  }
}
