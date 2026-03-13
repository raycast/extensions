import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { Folder, IdentityTitle, Item } from "~/types/vault";

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
    notes: hideIfDefined(item.notes),
    sshKey: cleanSshKey(item.sshKey),
  }));
}

export function prepareFoldersForCache(folders: Folder[]): Folder[] {
  return folders.map((folder) => ({ object: folder.object, id: folder.id, name: folder.name }));
}

function cleanFields(fields: Item["fields"]): Item["fields"] {
  return fields?.map((field) => ({
    name: field.name, // necessary for display
    value: hideIfDefined(field.value),
    type: field.type,
    linkedId: field.linkedId,
  }));
}

function cleanLogin(login: Item["login"]): Item["login"] {
  if (!login) return undefined;
  return {
    username: login.username, // necessary for display
    uris: login.uris,
    password: hideIfDefined(login.password),
    passwordRevisionDate: hideIfDefined(login.passwordRevisionDate),
    totp: hideIfDefined(login.totp),
  };
}

function cleanIdentity(identity: Item["identity"]): Item["identity"] {
  if (!identity) return undefined;
  return {
    title: hideIfDefined(identity.title) as IdentityTitle | null,
    firstName: hideIfDefined(identity.firstName),
    middleName: hideIfDefined(identity.middleName),
    lastName: hideIfDefined(identity.lastName),
    address1: hideIfDefined(identity.address1),
    address2: hideIfDefined(identity.address2),
    address3: hideIfDefined(identity.address3),
    city: hideIfDefined(identity.city),
    state: hideIfDefined(identity.state),
    postalCode: hideIfDefined(identity.postalCode),
    country: hideIfDefined(identity.country),
    company: hideIfDefined(identity.company),
    email: hideIfDefined(identity.email),
    phone: hideIfDefined(identity.phone),
    ssn: hideIfDefined(identity.ssn),
    username: hideIfDefined(identity.username),
    passportNumber: hideIfDefined(identity.passportNumber),
    licenseNumber: hideIfDefined(identity.licenseNumber),
  };
}

function cleanCard(card: Item["card"]): Item["card"] {
  if (!card) return undefined;
  return {
    brand: card.brand,
    cardholderName: hideIfDefined(card.cardholderName),
    number: hideIfDefined(card.number),
    expMonth: hideIfDefined(card.expMonth),
    expYear: hideIfDefined(card.expYear),
    code: hideIfDefined(card.code),
  };
}

function cleanPasswordHistory(passwordHistoryItems: Item["passwordHistory"]): Item["passwordHistory"] {
  return passwordHistoryItems?.map((passwordHistory) => ({
    password: hideIfDefined(passwordHistory.password),
    lastUsedDate: hideIfDefined(passwordHistory.lastUsedDate),
  }));
}

function cleanSshKey(sshKey: Item["sshKey"]): Item["sshKey"] {
  if (!sshKey) return undefined;
  return {
    publicKey: sshKey.publicKey,
    keyFingerprint: sshKey.keyFingerprint,
    privateKey: hideIfDefined(sshKey.privateKey),
  };
}

function hideIfDefined<T>(value: T) {
  if (!value) return value;
  return SENSITIVE_VALUE_PLACEHOLDER;
}
