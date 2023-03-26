import { PasswordHistory } from "~/types/passwords";

export interface Item {
  object: "item";
  id: string;
  organizationId: null | string;
  folderId: null;
  type: 1 | 2 | 3 | 4;
  reprompt: Reprompt;
  name: string;
  notes: null | string;
  favorite: boolean;
  login?: Login;
  collectionIds: string[];
  revisionDate: string;
  identity?: Identity;
  fields?: Field[];
  passwordHistory?: PasswordHistory[];
  secureNote?: SecureNote;
  card?: Card;
}

export interface Folder {
  object: string;
  id: string;
  name: string;
}

export interface Identity {
  middleName: string | null;
  lastName: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  ssn: string | null;
  username: string | null;
  passportNumber: string | null;
  licenseNumber: string | null;
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

export interface SecureNote {
  type: number;
}

export const enum Reprompt {
  NO = 0,
  REQUIRED = 1,
}

export type CacheFolder = Pick<Folder, "object" | "id" | "name">;

export type CacheVaultList = {
  items: Item[];
  folders: Folder[];
};

export type CacheItem = Pick<
  Item,
  "object" | "id" | "organizationId" | "folderId" | "type" | "name" | "login" | "revisionDate" | "favorite"
> & {
  hasNotes: boolean;
  revisionDate: string;
  identity?: string[];
  fields?: string[];
  card?: string[];
};
