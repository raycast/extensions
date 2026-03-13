export type Category = {
  name: CategoryName;
  uuid: string;
};
export type CategoryName =
  | "API_CREDENTIAL"
  | "BANK_ACCOUNT"
  | "CREDIT_CARD"
  | "CRYPTO_WALLET"
  | "CUSTOM"
  | "DATABASE"
  | "DOCUMENT"
  | "DRIVER_LICENSE"
  | "EMAIL_ACCOUNT"
  | "IDENTITY"
  | "LOGIN"
  | "MEDICAL_RECORD"
  | "MEMBERSHIP"
  | "OUTDOOR_LICENSE"
  | "PASSPORT"
  | "PASSWORD"
  | "REWARD_PROGRAM"
  | "SECURE_NOTE"
  | "SERVER"
  | "SOCIAL_SECURITY_NUMBER"
  | "SOFTWARE_LICENSE"
  | "SSH_KEY"
  | "WIRELESS_ROUTER";
export type Field = {
  id: string;
  type: string;
  value: string;
};
export type Item = {
  additional_information: string;
  category: CategoryName;
  created_at: string;
  favorite?: boolean;
  fields?: Field[];
  id: string;
  last_edited_by: string;
  title: string;
  updated_at: string;
  urls?: Url[];
  vault: Vault;
  version: number;
};
export type Url = {
  href: string;
  label?: string;
  primary: boolean;
};
export type User = {
  account_uuid: string;
  email: string;
  url: string;
  user_uuid: string;
};
export type Vault = {
  id: string;
  name: string;
};
