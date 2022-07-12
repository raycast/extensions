export type Preferences = {
  cliPath: string;
  clientId: string;
  clientSecret: string;
  fetchFavicons: boolean;
  serverUrl: string;
  serverCertsPath: string;
};

export type VaultStatus = "unauthenticated" | "locked" | "unlocked";
export type VaultState = {
  userEmail: string | null;
  status: VaultStatus;
  serverUrl: string | null;
};

export interface Item {
  object: "item";
  id: string;
  organizationId: null | string;
  folderId: null;
  type: 1 | 2 | 3 | 4;
  reprompt: number;
  name: string;
  notes: null | string;
  favorite: boolean;
  login?: Login;
  collectionIds: string[];
  revisionDate: string;
  identity?: { [key: string]: null | string };
  fields?: Field[];
  passwordHistory?: PasswordHistory[];
  secureNote?: SecureNote;
  card?: Card;
}

export interface Identity {
  name: string;
  identity: string;
  title: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  postalCode: number;
  country: string;
  company: string;
  email: string;
  phone: number;
  username: string;
}

export interface Card {
  cardholderName: string | null;
  brand: string | null;
  number: string | null;
  expMonth: string | null;
  expYear: string | null;
  code: string | null;
}

export interface Field {
  name: string;
  value: string;
  type: number;
}

export interface Login {
  username: null | string;
  password: null | string;
  totp: null;
  passwordRevisionDate: null | string;
  uris?: Uris[];
}

export interface Uris {
  match: null;
  uri: null | string;
}

export enum Object {
  Item = "item",
}

export interface PasswordHistory {
  lastUsedDate: string;
  password: string;
}

export interface SecureNote {
  type: number;
}

export type PasswordType = "password" | "passphrase";

export interface PasswordOptions {
  /** Include uppercase characters */
  lowercase?: boolean;
  /** Include lowercase characters */
  uppercase?: boolean;
  /** Include numeric characters */
  number?: boolean;
  /** Include special characters */
  special?: boolean;
  /** Length of the password */
  length?: number;
}

export interface PassphraseOptions {
  /** Number of words */
  words?: number;
  /** Word separator */
  separator?: string;
  /** Title case passphrase */
  capitalize?: boolean;
  /** Passphrase includes number */
  includeNumber?: boolean;
}
export type PasswordGeneratorOptions = {
  /** Generate a passphrase */
  passphrase?: boolean;
} & PasswordOptions &
  PassphraseOptions;

export interface PasswordOptionField {
  label: string;
  hint?: string;
  type: "boolean" | "number" | "string";
  errorMessage?: string;
}

export type PasswordOptionsToFieldEntries = [keyof PasswordGeneratorOptions, PasswordOptionField];
