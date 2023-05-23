import { PasswordHistory } from "~/types/passwords";

export interface Item {
  object: "item";
  id: string;
  organizationId: string | null;
  folderId: string | null;
  type: ItemType;
  reprompt: Reprompt;
  name: string;
  notes: string | null;
  favorite: boolean;
  login?: Login;
  collectionIds: string[];
  revisionDate: string;
  creationDate: string;
  deletedDate: string | null;
  identity?: Identity;
  fields?: Field[];
  passwordHistory?: PasswordHistory[];
  secureNote?: SecureNote;
  card?: Card;
}

export enum ItemType {
  LOGIN = 1,
  NOTE = 2,
  CARD = 3,
  IDENTITY = 4,
}

export interface Folder {
  object: "folder";
  id: string;
  name: string;
}

export enum IdentityTitle {
  MR = "Mr",
  MRS = "Mrs",
  MS = "Ms",
  MX = "Mx",
  DR = "Dr",
}

export interface Identity {
  title: IdentityTitle | null;
  firstName: string | null;
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

export enum CardBrand {
  VISA = "Visa",
  MASTERCARD = "Mastercard",
  AMEX = "Amex",
  DISCOVER = "Discover",
  DINERS_CLUB = "Diners Club",
  JCB = "JCB",
  MAESTRO = "Maestro",
  UNIONPAY = "UnionPay",
  RUPAY = "RuPay",
  OTHER = "Other",
}

export interface Card {
  cardholderName: string | null;
  brand: CardBrand | null;
  number: string | null;
  expMonth: string | null;
  expYear: string | null;
  code: string | null;
}

export enum FieldType {
  TEXT = 0,
  HIDDEN = 1,
  BOOLEAN = 2,
  LINKED = 3,
}

export interface Field {
  name: string;
  value: string;
  type: FieldType;
  linkedId: number | null;
}

export interface Login {
  username: string | null;
  password: string | null;
  totp: string | null;
  passwordRevisionDate: string | null;
  uris?: Uris[];
}

export enum UriMatch {
  BASE_DOMAIN = 0,
  HOST = 1,
  STARTS_WITH = 2,
  EXACT = 3,
  REGULAR_EXPRESSION = 4,
  NEVER = 5,
}

export interface Uris {
  match: UriMatch | null;
  uri: string | null;
}

export interface SecureNote {
  type: number;
}

export enum Reprompt {
  NO = 0,
  REQUIRED = 1,
}

export type Vault = {
  items: Item[];
  folders: Folder[];
};
