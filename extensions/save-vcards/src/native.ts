// Typed, logged access to the Swift side (swift/Sources/RaycastAPI.swift).
import {
  clipboardImage as swiftClipboardImage,
  contactsInfo as swiftContactsInfo,
  detect as swiftDetect,
  recognizeText as swiftRecognizeText,
  requestScreenAccess as swiftRequestScreenAccess,
  saveContact as swiftSaveContact,
  vcard as swiftVcard,
} from "swift:../swift";
import { log, timed } from "./core/log";
import type { Address, ContactDraft, Detection, Labeled } from "./core/parse";

export type Account = { id: string; name: string; isDefault: boolean };
export type ExistingContact = { id: string; name: string };
type ContactsInfo = {
  contactsAccess: string;
  accounts: Account[];
  existing: ExistingContact[];
  timings: Record<string, number>;
};
type SaveResult = {
  id: string;
  updated: boolean;
  noteDropped: boolean;
  timings: Record<string, number>;
};

/** The draft as the Swift side expects it (ContactDraft in ContactsCore.swift). */
export type NativeDraft = Omit<ContactDraft, "address"> & {
  address: Address | null;
  emails: Labeled[];
  phones: Labeled[];
  urls: Labeled[];
  note: string | null;
};

export class ContactsAccessError extends Error {}

// CoreError.contactsAccessDenied reaches JavaScript as its description.
const isAccessError = (err: unknown) =>
  String(err).includes("contacts-access-denied");

export const recognizeText = (imagePath: string) =>
  timed(
    "swift",
    "recognizeText",
    () => swiftRecognizeText(imagePath) as Promise<string>,
  );

export const detect = (text: string) =>
  timed("swift", "detect", () => swiftDetect(text) as Promise<Detection>);

export async function contactsInfo(
  emails: string[],
  phones: string[],
): Promise<ContactsInfo> {
  const info = (await timed("swift", "contactsInfo", () =>
    swiftContactsInfo(emails, phones),
  )) as ContactsInfo;
  log(
    "swift",
    `contactsInfo: access ${info.contactsAccess}, ${info.accounts.length} accounts, ${info.existing.length} matches`,
    info.timings,
  );
  return info;
}

export async function saveContact(
  draft: NativeDraft,
  accountId: string | null,
  updateId: string | null,
): Promise<SaveResult> {
  try {
    const result = (await timed("swift", "saveContact", () =>
      swiftSaveContact(draft, accountId, updateId),
    )) as SaveResult;
    log(
      "swift",
      `saved (updated: ${result.updated}, noteDropped: ${result.noteDropped})`,
      result.timings,
    );
    return result;
  } catch (err) {
    if (isAccessError(err)) throw new ContactsAccessError(String(err));
    throw err;
  }
}

export const vcard = (draft: NativeDraft) =>
  timed("swift", "vcard", () => swiftVcard(draft) as Promise<string>);

export const requestScreenAccess = () =>
  timed(
    "swift",
    "requestScreenAccess",
    () => swiftRequestScreenAccess() as Promise<boolean>,
  );

/** Writes the clipboard's image to `destination` as PNG; false if there is none. */
export const clipboardImage = (destination: string) =>
  timed(
    "swift",
    "clipboardImage",
    () => swiftClipboardImage(destination) as Promise<boolean>,
  );
