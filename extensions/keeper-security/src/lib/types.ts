export interface KeeperExtensionPreferences {
  apiUrl: string;
  apiKey: string;
}

export interface ProcessedRecord {
  recordUid: string;
  title: string;
  type: string;
  description: string;
  login?: string;
  password?: string;
}

export interface ListRecord {
  record_uid: string;
  title: string;
  type: string;
  description?: string;
}

export interface RecordField {
  type: string;
  label?: string;
  required?: boolean;
  value: unknown[];
  name?: string;
}

export interface DetailedRecordResponse {
  client_modified_time: string;
  custom: unknown[];
  custom_fields?: unknown[];
  fields: RecordField[];
  shared: boolean;
  title: string;
  type: string;
  notes?: string;
  login?: string;
  password?: string;
  login_url?: string;
}

export interface RecordDetails {
  fields: RecordField[];
}

export type RecordTypes =
  | "address"
  | "login"
  | "bankAccount"
  | "birthCertificate"
  | "contact"
  | "databaseCredentials"
  | "driverLicense"
  | "file"
  | "healthInsurance"
  | "ssnCard"
  | "membership"
  | "passport"
  | "bankCard"
  | "photo"
  | "encryptedNotes"
  | "serverCredentials"
  | "softwareLicense"
  | "sshKeys"
  | "pamDatabase"
  | "pamDirectory"
  | "pamMachine"
  | "pamUser"
  | "pamRemoteBrowser";
