import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";

import { SearchNotePreferences, Note, Vault } from "./interfaces";
import { getNoteFileContent } from "./utils";

class NoteLoader {
  vaultPath: string;

  constructor(vault: Vault) {
    this.vaultPath = vault.path;
  }

  loadNotes() {
    const notes: Note[] = [];
    const files = this.getFiles();

    let key = 0;
    for (const f of files) {
      const comp = f.split("/");
      const f_name = comp.pop();
      let name = "default";
      if (f_name) {
        name = f_name.split(".md")[0];
      }
      const note = {
        title: name,
        key: ++key,
        path: f,
        content: getNoteFileContent(f),
      };
      notes.push(note);
    }
    // console.log("Loaded " + notes.length + " notes.");
    return notes;
  }

  getFiles() {
    const exFolders = this.prefExcludedFolders();
    const files = this.getFilesHelp(this.vaultPath, exFolders, []);
    return files;
  }

  getFilesHelp(dirPath: string, exFolders: string[], arrayOfFiles: string[]) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    for (const file of files) {
      const next = fs.statSync(dirPath + "/" + file);
      if (next.isDirectory() && !file.includes(".obsidian")) {
        arrayOfFiles = this.getFilesHelp(dirPath + "/" + file, exFolders, arrayOfFiles);
      } else {
        if (
          file.endsWith(".md") &&
          file !== ".md" &&
          !dirPath.includes(".obsidian") &&
          this.isValidFile(dirPath, exFolders)
        ) {
          arrayOfFiles.push(path.join(dirPath, "/", file));
        }
      }
    }

    return arrayOfFiles;
  }

  isValidFile(file: string, exFolders: string[]) {
    for (const folder of exFolders) {
      if (file.includes(folder)) {
        return false;
      }
    }
    return true;
  }

  prefExcludedFolders() {
    const pref: SearchNotePreferences = getPreferenceValues();
    const foldersString = pref.excludedFolders;
    if (foldersString) {
      const folders = foldersString.split(",");
      for (let i = 0; i < folders.length; i++) {
        folders[i] = folders[i].trim();
      }
      return folders;
    } else {
      return [];
    }
  }
}

export default NoteLoader;
