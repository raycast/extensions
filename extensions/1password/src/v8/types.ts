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

export type Category = {
  uuid: string;
  name: CategoryName;
};

export type Item = {
  id: string;
  title: string;
  version: number;
  vault: Vault;
  favorite?: boolean;
  category: CategoryName;
  last_edited_by: string;
  created_at: string;
  updated_at: string;
  additional_information: string;
  urls?: Url[];
  fields?: Field[];
};

export type Field = {
  id: string;
  type: string;
  value: string;
};

export type Vault = {
  id: string;
  name: string;
};

export type Url = {
  label?: string;
  primary: boolean;
  href: string;
};

export type User = {
  url: string;
  email: string;
  user_uuid: string;
  account_uuid: string;
};
