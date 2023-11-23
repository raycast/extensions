import { OmitIntersection } from "./util";

export type VaultCredentialDto = {
  title?: string;
  email?: string;
  login?: string;
  password: string;
  url: string;
  secondaryLogin?: string;
  category?: string;
  note?: string;
  lastBackupTime: string;
  autoProtected: "true" | "false";
  autoLogin: "true" | "false";
  subdomainOnly: "true" | "false";
  useFixedUrl: "true" | "false";
  otpSecret?: string;
  appMetaData?: string;
  status: "ACCOUNT_NOT_VERIFIED" | "ACCOUNT_VERIFIED" | "ACCOUNT_INVALID";
  numberUse: string;
  lastUse: string;
  strength: string;
  modificationDatetime: string;
  checked: "true" | "false";
  id: string;
  anonId: string;
  localeFormat: string;
};

export type VaultCredential = OmitIntersection<
  VaultCredentialDto,
  {
    /**
     * timestamp
     */
    lastBackupTime: number;
    autoProtected: boolean;
    autoLogin: boolean;
    subdomainOnly: boolean;
    useFixedUrl: boolean;
    /**
     * info about linked mobile applications
     */
    appMetaData?: string;
    numberUse: number;
    /**
     * timestamp
     */
    lastUse: number;
    /**
     * number between 0 and 100
     */
    strength: number;
    /**
     * timestamp
     */
    modificationDatetime: number;
    checked: boolean;
  }
>;

export type VaultCredentialStatus = VaultCredential["status"];

export interface VaultNoteDto {
  anonId: string;
  /**
   * Stringified JSON
   */
  attachments?: string;
  category?: string;
  creationDatetime?: string;
  id: string;
  lastBackupTime?: string;
  secured?: "true" | "false";
  title: string;
  type: string;
  updateDate?: string;
  userModificationDatetime?: string;
  content?: string;
  creationDate?: string;
  lastUse?: string;
  localeFormat?: string;
}

export type VaultNote = OmitIntersection<
  VaultNoteDto,
  {
    attachments?: NoteAttachment[];
    creationDatetime?: number;
    lastBackupTime?: number;
    secured?: boolean;
    updateDate?: number;
    userModificationDatetime?: number;
    creationDate?: number;
    lastUse?: number;
  }
>;

export interface NoteAttachment {
  creationDatetime: number;
  cryptoKey: string;
  downloadKey: string;
  filename: string;
  id: string;
  localSize: number;
  owner: string;
  remoteSize: number;
  type: string;
  userModificationDatetime: number;
  version: number;
}
