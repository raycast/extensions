import { showToast, Toast, environment } from "@raycast/api";
import fs from "fs";

import { Note } from "./interfaces";

interface DataProps {
  vaultPath: string;
  pinnedNotes: Note[];
}

function getInfo(vaultPath: string) {
  if (!fs.existsSync(environment.supportPath + "/data.json")) {
    fs.writeFileSync(environment.supportPath + "/data.json", "[]");
  }

  const data = fs.readFileSync(environment.supportPath + "/data.json", "utf8");
  const parsedData: DataProps[] = JSON.parse(data);

  const vaults = parsedData.filter((vault) => vault.vaultPath == vaultPath);
  if (vaults.length == 0) {
    const emptyData = { vaultPath: vaultPath, pinnedNotes: [] };
    parsedData.push(emptyData);
    fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(parsedData));
    return { vault: emptyData, pinnedNotes: emptyData.pinnedNotes, data: parsedData };
  } else {
    return { vault: vaults[0], pinnedNotes: vaults[0].pinnedNotes, data: parsedData };
  }
}

export function getPinnedNotes(path: string): Note[] {
  const info = getInfo(path);
  return info.pinnedNotes;
}

export function unpinNote(note: Note, vaultPath: string) {
  const info = getInfo(vaultPath);

  const pinnedNotes = info.pinnedNotes.filter((pinnedNote) => pinnedNote.key !== note.key);
  info.vault.pinnedNotes = pinnedNotes;

  const idx = info.data.findIndex((vault) => vault.vaultPath == vaultPath);
  info.data[idx] = info.vault;

  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(info.data));

  showToast({
    title: "Note Unpinned",
    message: "'" + note.title + "' unpinned successfully.",
    style: Toast.Style.Success,
  });

  return pinnedNotes;
}

export function isNotePinned(note: Note, vaultPath: string) {
  const info = getInfo(vaultPath);
  return info.pinnedNotes.filter((pinnedNote) => pinnedNote.key == note.key).length !== 0;
}

export function pinNote(note: Note, vaultPath: string) {
  const info = getInfo(vaultPath);

  if (isNotePinned(note, vaultPath)) {
    showToast({
      title: "Already Pinned",
      message: "'" + note.title + "' is already pinned.",
      style: Toast.Style.Failure,
    });
    return;
  }

  info.vault.pinnedNotes.push(note);

  const idx = info.data.findIndex((vault) => vault.vaultPath == vaultPath);
  info.data[idx] = info.vault;

  fs.writeFileSync(environment.supportPath + "/data.json", JSON.stringify(info.data));

  showToast({
    title: "Note Pinned",
    message: "'" + note.title + "' pinned successfully.",
    style: Toast.Style.Success,
  });
}
