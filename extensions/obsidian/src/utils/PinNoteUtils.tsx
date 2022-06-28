import { showToast, Toast, environment, Icon, confirmAlert } from "@raycast/api";
import fs from "fs";

import { Note, Vault } from "./interfaces";
import { getNoteFileContent } from "./utils";

interface DataProps {
  vaultPath: string;
  pinnedNotes: Note[];
}

export async function resetPinnedNotes(vault: Vault) {
  const info = getInfo(vault);

  info.vault.pinnedNotes = [];

  const idx = info.data.findIndex((v) => v.vaultPath == vault.path);
  info.data[idx] = info.vault;

  const options = {
    title: "Reset Pinned Notes",
    message: 'Are you sure you want to reset all pinned notes for: "' + vault.name + '"?',
    icon: Icon.ExclamationMark,
  };

  if (await confirmAlert(options)) {
    fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(info.data));
    showToast(Toast.Style.Success, "Reset Pinned Notes for " + vault.name);
    return true;
  }
}

function getInfo(vault: Vault) {
  if (!fs.existsSync(environment.supportPath + "/data.json")) {
    fs.writeFileSync(environment.supportPath + "/data.json", "[]");
  }

  const data = fs.readFileSync(environment.supportPath + "/data.json", "utf8");
  const parsedData: DataProps[] = JSON.parse(data);

  const vaults = parsedData.filter((v) => v.vaultPath == vault.path);
  if (vaults.length == 0) {
    const emptyData = { vaultPath: vault.path, pinnedNotes: [] };
    parsedData.push(emptyData);
    fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(parsedData));
    return { vault: emptyData, pinnedNotes: emptyData.pinnedNotes, data: parsedData };
  } else {
    return { vault: vaults[0], pinnedNotes: vaults[0].pinnedNotes, data: parsedData };
  }
}

export function getPinnedNotes(vault: Vault): Note[] {
  const info = getInfo(vault);

  // Make sure old pinned notes conform to newest interface
  info.pinnedNotes.forEach((note) => {
    if (note.content == undefined || note.content == "") {
      note.content = getNoteFileContent(note.path);
      unpinNote(note, vault);
      pinNote(note, vault);
    }
  });
  return info.pinnedNotes;
}

export function unpinNote(note: Note, vault: Vault) {
  const info = getInfo(vault);

  const pinnedNotes = info.pinnedNotes.filter((pinnedNote) => pinnedNote.path !== note.path);
  info.vault.pinnedNotes = pinnedNotes;

  const idx = info.data.findIndex((v) => v.vaultPath == vault.path);
  info.data[idx] = info.vault;

  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(info.data));

  showToast({
    title: "Note Unpinned",
    message: "'" + note.title + "' unpinned successfully.",
    style: Toast.Style.Success,
  });

  return pinnedNotes;
}

export function isNotePinned(note: Note, vault: Vault) {
  const info = getInfo(vault);
  return info.pinnedNotes.filter((pinnedNote) => pinnedNote.path == note.path).length !== 0;
}

export function pinNote(note: Note, vault: Vault) {
  const info = getInfo(vault);

  if (isNotePinned(note, vault)) {
    showToast({
      title: "Already Pinned",
      message: "'" + note.title + "' is already pinned.",
      style: Toast.Style.Failure,
    });
    return;
  }

  info.vault.pinnedNotes.push(note);

  const idx = info.data.findIndex((v) => v.vaultPath == vault.path);
  info.data[idx] = info.vault;

  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(info.data));

  showToast({
    title: "Note Pinned",
    message: "'" + note.title + "' pinned successfully.",
    style: Toast.Style.Success,
  });
}
