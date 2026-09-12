import * as v from "valibot";

const StringBooleanSchema = v.pipe(
  v.unknown(),
  v.transform((v) => v === "true"),
);
const StringNumberSchema = v.pipe(
  v.unknown(),
  v.transform((v) => (typeof v === "string" ? parseInt(v, 10) : 0)),
);

export const VaultCredentialSchema = v.object({
  id: v.string("ID is required."),
  password: v.string("Password is required."),
  title: v.optional(v.string()),
  email: v.optional(v.string()),
  login: v.optional(v.string()),
  url: v.optional(v.string()),
  secondaryLogin: v.optional(v.string()),
  category: v.optional(v.string()),
  note: v.optional(v.string()),
  lastBackupTime: v.optional(StringNumberSchema),
  autoProtected: v.optional(StringBooleanSchema),
  autoLogin: v.optional(StringBooleanSchema),
  subdomainOnly: v.optional(StringBooleanSchema),
  useFixedUrl: v.optional(StringBooleanSchema),
  otpSecret: v.optional(v.string()),
  appMetaData: v.optional(v.string()),
  status: v.optional(v.picklist(["ACCOUNT_NOT_VERIFIED", "ACCOUNT_VERIFIED", "ACCOUNT_INVALID"])),
  numberUse: v.optional(StringNumberSchema, 0),
  lastUse: v.optional(StringNumberSchema),
  strength: v.optional(StringNumberSchema, 0),
  modificationDatetime: v.optional(StringNumberSchema),
  checked: v.optional(StringBooleanSchema),
  anonId: v.optional(v.string()),
  localeFormat: v.optional(v.string()),
});

export type VaultCredential = v.InferOutput<typeof VaultCredentialSchema>;

const VaultNoteAttachmentSchema = v.object({
  id: v.string("Attachment ID is required."),
  filename: v.string("Filename is required."),
  type: v.string("Type is required."),
  creationDatetime: v.optional(v.number()),
  cryptoKey: v.optional(v.string()),
  downloadKey: v.optional(v.string()),
  localSize: v.optional(v.number()),
  owner: v.optional(v.string()),
  remoteSize: v.optional(v.number()),
  userModificationDatetime: v.optional(v.number()),
  version: v.optional(v.number(), 1),
});

export type NoteAttachment = v.InferOutput<typeof VaultNoteAttachmentSchema>;

export const VaultNoteSchema = v.object({
  id: v.string("ID is required."),
  anonId: v.optional(v.string()),
  title: v.optional(v.string(), "Untitled Note"),
  content: v.optional(v.string()),
  attachments: v.optional(v.array(VaultNoteAttachmentSchema)),
  category: v.optional(v.string()),
  secured: v.optional(StringBooleanSchema, false),
  type: v.optional(v.string()),
  creationDatetime: v.optional(StringNumberSchema),
  lastBackupTime: v.optional(StringNumberSchema),
  updateDate: v.optional(StringNumberSchema),
  userModificationDatetime: v.optional(StringNumberSchema),
  creationDate: v.optional(StringNumberSchema),
  lastUse: v.optional(StringNumberSchema),
  localeFormat: v.optional(v.string()),
});

export type VaultNote = v.InferOutput<typeof VaultNoteSchema>;

export type Device = {
  deviceId: string;
  deviceName?: string;
  devicePlatform?: string;
  creationDateUnix: number;
  lastUpdateDateUnix: number;
  lastActivityDateUnix: number;
  isCurrentDevice: boolean;
};
