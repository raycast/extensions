import { HIDDEN_PLACEHOLDER } from "~/constants/general";
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
    // sensitive data below
    collectionIds: [],
    notes: item.notes != null ? HIDDEN_PLACEHOLDER : item.notes,
    passwordHistory: undefined,
    secureNote: undefined,
    login: cleanLogin(item.login),
    identity: hideStringProperties(item.identity),
    fields: cleanFields(item.fields),
    card: hideStringProperties(item.card),
  }));
}

export function prepareFoldersForCache(folders: Folder[]): Folder[] {
  return folders.map((folder) => ({ object: folder.object, id: folder.id, name: folder.name }));
}

function cleanLogin(login: Item["login"]): Item["login"] {
  if (!login) return undefined;
  // leave username because it's necessary to display in the list
  return { ...hideStringProperties(login), username: login.username };
}

function cleanFields(fields: Item["fields"]): Item["fields"] {
  if (!fields) return undefined;
  // leave name because it's necessary to display in the list
  return fields.map((field) => ({
    name: field.name,
    value: HIDDEN_PLACEHOLDER,
    type: field.type,
    linkedId: field.linkedId,
  }));
}

function hideStringProperties<T extends RecordOfAny | undefined>(obj: T): T {
  if (!obj) return undefined as T;
  const cleanObj: T = { ...obj };
  for (const [key, value] of Object.entries(obj)) {
    if (value != null && typeof value === "string") {
      cleanObj[key] = HIDDEN_PLACEHOLDER;
    }
  }
  return cleanObj as T;
}
