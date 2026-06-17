import { Icon } from "@raycast/api";
import { RecordTypes } from "./types";

export const RECORD_TYPES = {
  ADDRESS: "address",
  LOGIN: "login",
  BANK_ACCOUNT: "bankAccount",
  BIRTH_CERTIFICATE: "birthCertificate",
  CONTACT: "contact",
  DATABASE_CREDENTIALS: "databaseCredentials",
  DRIVER_LICENSE: "driverLicense",
  FILE: "file",
  HEALTH_INSURANCE: "healthInsurance",
  SSN_CARD: "ssnCard",
  MEMBERSHIP: "membership",
  PASSPORT: "passport",
  BANK_CARD: "bankCard",
  PHOTO: "photo",
  ENCRYPTED_NOTES: "encryptedNotes",
  SERVER_CREDENTIALS: "serverCredentials",
  SOFTWARE_LICENSE: "softwareLicense",
  SSH_KEYS: "sshKeys",
  PAM_DATABASE: "pamDatabase",
  PAM_DIRECTORY: "pamDirectory",
  PAM_MACHINE: "pamMachine",
  PAM_USER: "pamUser",
  PAM_REMOTE_BROWSER: "pamRemoteBrowser",
} as const;

export const RECORD_TYPE_TO_TITLE_MAP: Record<RecordTypes, string> = {
  [RECORD_TYPES.ADDRESS]: "Address",
  [RECORD_TYPES.LOGIN]: "Login",
  [RECORD_TYPES.BANK_ACCOUNT]: "Bank Account",
  [RECORD_TYPES.BIRTH_CERTIFICATE]: "Birth Certificate",
  [RECORD_TYPES.CONTACT]: "Contact",
  [RECORD_TYPES.DATABASE_CREDENTIALS]: "Database Credentials",
  [RECORD_TYPES.DRIVER_LICENSE]: "Driver License",
  [RECORD_TYPES.FILE]: "File",
  [RECORD_TYPES.HEALTH_INSURANCE]: "Health Insurance",
  [RECORD_TYPES.SSN_CARD]: "SSN Card",
  [RECORD_TYPES.MEMBERSHIP]: "Membership",
  [RECORD_TYPES.PASSPORT]: "Passport",
  [RECORD_TYPES.BANK_CARD]: "Bank Card",
  [RECORD_TYPES.PHOTO]: "Photo",
  [RECORD_TYPES.ENCRYPTED_NOTES]: "Encrypted Notes",
  [RECORD_TYPES.SERVER_CREDENTIALS]: "Server Credentials",
  [RECORD_TYPES.SOFTWARE_LICENSE]: "Software License",
  [RECORD_TYPES.SSH_KEYS]: "SSH Keys",
  [RECORD_TYPES.PAM_DATABASE]: "PAM Database",
  [RECORD_TYPES.PAM_DIRECTORY]: "PAM Directory",
  [RECORD_TYPES.PAM_MACHINE]: "PAM Machine",
  [RECORD_TYPES.PAM_USER]: "PAM User",
  [RECORD_TYPES.PAM_REMOTE_BROWSER]: "PAM Remote Browser",
} as const;

export const getRecordaTypeIcon = (type: RecordTypes) => {
  switch (type) {
    case RECORD_TYPES.ADDRESS:
      return Icon.Pin;
    case RECORD_TYPES.LOGIN:
      return Icon.Lock;
    case RECORD_TYPES.BANK_ACCOUNT:
      return Icon.Wallet;
    case RECORD_TYPES.BIRTH_CERTIFICATE:
      return Icon.Dna;
    case RECORD_TYPES.CONTACT:
      return Icon.TwoPeople;
    case RECORD_TYPES.DATABASE_CREDENTIALS:
      return Icon.HardDrive;
    case RECORD_TYPES.DRIVER_LICENSE:
      return Icon.Car;
    case RECORD_TYPES.FILE:
      return Icon.BlankDocument;
    case RECORD_TYPES.HEALTH_INSURANCE:
      return Icon.Heartbeat;
    case RECORD_TYPES.SSN_CARD:
      return Icon.CreditCard;
    case RECORD_TYPES.MEMBERSHIP:
      return Icon.StarCircle;
    case RECORD_TYPES.PASSPORT:
      return Icon.Globe;
    case RECORD_TYPES.BANK_CARD:
      return Icon.CreditCard;
    case RECORD_TYPES.PHOTO:
      return Icon.PersonCircle;
    case RECORD_TYPES.ENCRYPTED_NOTES:
      return Icon.Lock;
    case RECORD_TYPES.SERVER_CREDENTIALS:
      return Icon.HardDrive;
    case RECORD_TYPES.SOFTWARE_LICENSE:
      return Icon.CodeBlock;
    case RECORD_TYPES.SSH_KEYS:
      return Icon.Terminal;
    case RECORD_TYPES.PAM_DATABASE:
      return Icon.Coin;
    case RECORD_TYPES.PAM_DIRECTORY:
      return Icon.Layers;
    case RECORD_TYPES.PAM_MACHINE:
      return Icon.Monitor;
    case RECORD_TYPES.PAM_USER:
      return Icon.Person;
    case RECORD_TYPES.PAM_REMOTE_BROWSER:
      return Icon.Devices;
    default:
      return Icon.Document;
  }
};

export function titleCaseWord(word: string) {
  if (!word) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function camelCaseToWords(input: string): string {
  if (!input) return input;

  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between lower and upper
    .replace(/^./, (char) => char.toUpperCase()); // Capitalize first letter
}

/**
 * Check if the error is a canceled error got from aborting a previous request
 * @param error Error
 * @returns boolean
 */
export function isCanceledError(error: Error): boolean {
  return error.name === "CanceledError";
}
