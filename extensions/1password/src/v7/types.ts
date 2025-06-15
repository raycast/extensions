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

export type V7Item = {
  uuid: string;
  profileUUID: string;
  vaultUUID: string;
  categoryUUID: string;
  itemTitle: string;
  itemDescription: string;
  websiteURLs?: string[];
  accountName?: string;
  vaultName: string;
  categoryPluralName: string;
  categorySingularName: string;
  modifiedAt: number;
  createdAt: number;
};

export type V7Category = {
  id: string;
  name: string;
  items: V7Item[];
};
