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
  identity?: { [key: string]: null | string };
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

export interface SecureNote {
  type: number;
}

export const enum Reprompt {
  NO = 0,
  REQUIRED = 1,
}
