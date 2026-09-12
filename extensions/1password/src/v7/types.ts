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
export type V7Category = {
  id: string;
  items: V7Item[];
  name: string;
};
export type V7Item = {
  accountName?: string;
  categoryPluralName: string;
  categorySingularName: string;
  categoryUUID: string;
  createdAt: number;
  itemDescription: string;
  itemTitle: string;
  modifiedAt: number;
  profileUUID: string;
  uuid: string;
  vaultName: string;
  vaultUUID: string;
  websiteURLs?: string[];
};
