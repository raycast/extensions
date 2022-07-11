import { showToast, Toast, environment, Icon, confirmAlert } from "@raycast/api";
import fs from "fs";

import { Note, Vault, PinnedNotesJSON } from "./interfaces";
import { getCurrentPinnedVersion, getNoteFileContent, isNote, tagsFor } from "./utils";
import { noteAlreadyPinnedToast, notePinnedToast, noteUnpinnedToast } from "../components/Toasts";
import { CURRENT_EXTENSION_VERSION } from "./constants";

export function getInfoFor(vault: Vault): { pinnedNotes: string[]; vault: Vault; data: PinnedNotesJSON[] } {
  if (!fs.existsSync(environment.supportPath + "/data.json")) {
    fs.writeFileSync(environment.supportPath + "/data.json", "[]");
  }

  const data = fs.readFileSync(environment.supportPath + "/data.json", "utf8");
  const parsedData: PinnedNotesJSON[] = JSON.parse(data);

  const dataForVault = parsedData.find((d) => d.vaultPath === vault.path);

  if (dataForVault) {
    return { pinnedNotes: dataForVault?.pinnedNotes!, vault: vault, data: parsedData! };
  } else {
    parsedData.push({ vaultPath: vault.path, pinnedNotes: [] });
    fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(parsedData));
    return { pinnedNotes: [], vault: vault, data: parsedData };
  }
}

export function migratePinnedNotes() {
  const version = getCurrentPinnedVersion();

  if (version != CURRENT_EXTENSION_VERSION) {
    const data = fs.readFileSync(environment.supportPath + "/data.json", "utf8");
    const parsedData: [{ vaultPath: string; pinnedNotes: [{ title: string; path: string; content: string }] }] =
      JSON.parse(data);

    let migratedData: PinnedNotesJSON[] = [];

    for (let vault of parsedData) {
      let paths = [];
      console.log(vault);
      for (let note of vault.pinnedNotes) {
        paths.push(note.path);
      }
      migratedData.push({ vaultPath: vault.vaultPath, pinnedNotes: paths });
    }
    fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(migratedData));
    fs.writeFileSync(environment.supportPath + "/version.txt", CURRENT_EXTENSION_VERSION);
  }
}

export function getPinnedNotes(vault: Vault) {
  const { pinnedNotes } = getInfoFor(vault);
  let pinnedNoteObjects = pinnedNotes
    .map((p) => {
      const comp = p.split("/");
      const f_name = comp.pop();
      let name = "default";
      if (f_name) {
        name = f_name.split(".md")[0];
      }
      try {
        const content = getNoteFileContent(p, false);

        const note: Note = {
          title: name,
          path: p,
          tags: tagsFor(content),
          content: content,
        };
        return note;
      } catch {
        unpinNotePath(p, vault);
      }
    })
    .filter(isNote);

  return pinnedNoteObjects;
}

function unpinNotePath(path: string, vault: Vault) {
  let { pinnedNotes, data } = getInfoFor(vault);
  pinnedNotes = pinnedNotes.filter((n) => n != path);

  const idx = data.findIndex((d) => d.vaultPath == vault.path);
  data[idx].pinnedNotes = pinnedNotes;
  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(data));
  return pinnedNotes;
}

export function unpinNote(note: Note, vault: Vault) {
  let { pinnedNotes, data } = getInfoFor(vault);
  pinnedNotes = pinnedNotes.filter((n) => n != note.path);

  const idx = data.findIndex((d) => d.vaultPath == vault.path);
  data[idx].pinnedNotes = pinnedNotes;
  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(data));
  noteUnpinnedToast(note);
  return pinnedNotes;
}

export function isNotePinned(note: Note, vault: Vault) {
  const { pinnedNotes } = getInfoFor(vault);
  if (pinnedNotes.includes(note.path)) {
    return true;
  }
  return false;
}

export function pinNote(note: Note, vault: Vault) {
  let { pinnedNotes, data } = getInfoFor(vault);
  if (isNotePinned(note, vault)) {
    noteAlreadyPinnedToast(note);
    return;
  }
  pinnedNotes.push(note.path);
  const idx = data.findIndex((v) => v.vaultPath == vault.path);
  data[idx].pinnedNotes = pinnedNotes;
  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(data));
  notePinnedToast(note);
}

export async function resetPinnedNotes(vault: Vault) {
  let { pinnedNotes, data } = getInfoFor(vault);
  pinnedNotes = [];

  const idx = data.findIndex((d) => d.vaultPath == vault.path);
  data[idx].pinnedNotes = pinnedNotes;

  const options = {
    title: "Reset Pinned Notes",
    message: 'Are you sure you want to reset all pinned notes for: "' + vault.name + '"?',
    icon: Icon.ExclamationMark,
  };
  if (await confirmAlert(options)) {
    fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(data));
    showToast(Toast.Style.Success, "Reset Pinned Notes for " + vault.name);
    return true;
  }
}
