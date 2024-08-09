import { getPreferenceValues } from "@raycast/api";
import { promises as fs } from "fs";
import { Note } from "./note";

const preferences = getPreferenceValues<ExtensionPreferences>();

export async function getNotes(): Promise<Note[]> {
  const data = await fs.readFile(preferences.noteFile, "utf-8");

  if (data.length == 0) {
    return [];
  }
  const noteList = JSON.parse(data) as Note[];
  const pinedNote = noteList.filter((note) => note.clipped);
  const unPinedNote = noteList.filter((note) => !note.clipped);

  return pinedNote.sort().concat(unPinedNote.sort());

}



export async function saveNotes(notes: Note[]) {
  await fs.writeFile(preferences.noteFile, JSON.stringify(notes));
}

