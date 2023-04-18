import { SENSITIVE_VALUE_PLACEHOLDER as SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { Folder, Item } from "~/types/vault";

export function prepareItemsForCache(items: Item[]): Item[] {
  return items.map((item) => ({
    object: item.object,
    id: item.id,
    organizationId: item.organizationId,
    folderId: item.folderId,
    type: item.type,
    name: item.name,
    revisionDate: item.revisionDate,
    creationDate: item.creationDate,
    deletedDate: item.deletedDate,
    favorite: item.favorite,
    reprompt: item.reprompt,
    collectionIds: item.collectionIds,
    secureNote: item.secureNote ? { type: item.secureNote.type } : undefined,
    // sensitive data below
    fields: cleanFields(item.fields),
    login: cleanLogin(item.login),
    identity: cleanIdentity(item.identity),
    card: cleanCard(item.card),
    passwordHistory: cleanPasswordHistory(item.passwordHistory),
    notes: item.notes != null ? SENSITIVE_VALUE_PLACEHOLDER : null,
  }));
}

export function prepareFoldersForCache(folders: Folder[]): Folder[] {
  return folders.map((folder) => ({ object: folder.object, id: folder.id, name: folder.name }));
}

function cleanFields(fields: Item["fields"]): Item["fields"] {
  return fields?.map((field) => ({
    name: field.name, // necessary for display
    value: SENSITIVE_VALUE_PLACEHOLDER,
    type: field.type,
    linkedId: field.linkedId,
  }));
}

function cleanLogin(login: Item["login"]): Item["login"] {
  if (!login) return undefined;
  return {
    username: login.username, // necessary for display
    uris: login.uris,
    password: SENSITIVE_VALUE_PLACEHOLDER,
    passwordRevisionDate: SENSITIVE_VALUE_PLACEHOLDER,
    totp: SENSITIVE_VALUE_PLACEHOLDER,
  };
}

function cleanIdentity(identity: Item["identity"]): Item["identity"] {
  if (!identity) return undefined;
  return {
    middleName: SENSITIVE_VALUE_PLACEHOLDER,
    lastName: SENSITIVE_VALUE_PLACEHOLDER,
    address1: SENSITIVE_VALUE_PLACEHOLDER,
    address2: SENSITIVE_VALUE_PLACEHOLDER,
    address3: SENSITIVE_VALUE_PLACEHOLDER,
    city: SENSITIVE_VALUE_PLACEHOLDER,
    state: SENSITIVE_VALUE_PLACEHOLDER,
    postalCode: SENSITIVE_VALUE_PLACEHOLDER,
    country: SENSITIVE_VALUE_PLACEHOLDER,
    company: SENSITIVE_VALUE_PLACEHOLDER,
    email: SENSITIVE_VALUE_PLACEHOLDER,
    phone: SENSITIVE_VALUE_PLACEHOLDER,
    ssn: SENSITIVE_VALUE_PLACEHOLDER,
    username: SENSITIVE_VALUE_PLACEHOLDER,
    passportNumber: SENSITIVE_VALUE_PLACEHOLDER,
    licenseNumber: SENSITIVE_VALUE_PLACEHOLDER,
  };
}

function cleanCard(card: Item["card"]): Item["card"] {
  if (!card) return undefined;
  return {
    cardholderName: SENSITIVE_VALUE_PLACEHOLDER,
    brand: SENSITIVE_VALUE_PLACEHOLDER,
    number: SENSITIVE_VALUE_PLACEHOLDER,
    expMonth: SENSITIVE_VALUE_PLACEHOLDER,
    expYear: SENSITIVE_VALUE_PLACEHOLDER,
    code: SENSITIVE_VALUE_PLACEHOLDER,
  };
}

function cleanPasswordHistory(passwordHistory: Item["passwordHistory"]): Item["passwordHistory"] {
  return passwordHistory?.map(() => ({
    password: SENSITIVE_VALUE_PLACEHOLDER,
    lastUsedDate: SENSITIVE_VALUE_PLACEHOLDER,
  }));
}
