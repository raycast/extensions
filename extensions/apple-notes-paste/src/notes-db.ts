import os from "node:os";
import { resolve } from "node:path";

export const NOTES_DB = resolve(os.homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

export type Note = {
  id: string;
  title: string;
  snippet: string;
  folder: string;
  account: string;
  uuid: string;
  folderKey: string;
};

export type Folder = { key: string; name: string; account: string };

export function getOpenNoteURL(uuid: string) {
  return `applenotes://showNote?identifier=${uuid}`;
}
