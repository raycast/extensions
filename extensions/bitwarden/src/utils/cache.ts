import { HIDDEN_PLACEHOLDER } from "~/constants/general";
import { Folder, Item } from "~/types/vault";

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

function cleanLogin(login: Item["login"]): Item["login"] {
  if (!login) return undefined;
  // leave username because it's necessary to display in the list
  // TODO: Investigate how sensitive URIs are because they're needed for icons
  return { ...hideStringProperties(login), username: login.username };
}

function cleanFields(fields: Item["fields"]): Item["fields"] {
  if (!fields) return undefined;
  // leave username because it's necessary to display in the list
  return fields.map((field) => ({ name: field.name, value: HIDDEN_PLACEHOLDER, type: field.type }));
}

export const prepareItemForCache = (item: Item): Item => ({
  object: item.object,
  id: item.id,
  organizationId: item.organizationId,
  folderId: item.folderId,
  type: item.type,
  name: item.name,
  revisionDate: item.revisionDate,
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
});

export const prepareItemsForCache = (items: Item[]): Item[] => items.map(prepareItemForCache);

export const prepareFolderForCache = (folder: Folder): Folder => ({
  object: folder.object,
  id: folder.id,
  name: folder.name,
});

export const prepareFoldersForCache = (folders: Folder[]): Folder[] => folders.map(prepareFolderForCache);
