import { Cache, Icon } from "@raycast/api";
import { AUDIO_FILE_EXTENSIONS, BYTES_PER_MEGABYTE, VIDEO_FILE_EXTENSIONS } from "./constants";
import { Note, Vault, Media } from "./interfaces";
import { getNoteFileContent, prefExcludedFolders, tagsFor, walkFilesHelper } from "./utils";
import path from "path";

const cache = new Cache({ capacity: BYTES_PER_MEGABYTE * 500 });

export function useNotes(vault: Vault) {
  console.log(vault.name);
  if (cache.has(vault.name)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    if (data.lastCached > Date.now() - 1000 * 60 * 5) {
      console.log("Cache still valid");
      return data.notes;
    }
  } else {
    console.log("Cache not found");
  }
  const nl = new NoteLoader(vault);
  const notes = nl.loadNotes();
  cache.set(vault.name, JSON.stringify({ lastCached: Date.now(), notes: notes }));

  return notes;
}

export class NoteLoader {
  vaultPath: string;

  constructor(vault: Vault) {
    this.vaultPath = vault.path;
  }

  loadNotes() {
    console.log("Loading Notes for vault: " + this.vaultPath);
    const notes: Note[] = [];
    const files = this._getFiles();

    for (const f of files) {
      const comp = f.split("/");
      const f_name = comp.pop();
      let name = "default";
      if (f_name) {
        name = f_name.split(".md")[0];
      }

      const noteContent = getNoteFileContent(f, false);

      const note: Note = {
        title: name,
        path: f,
        tags: tagsFor(noteContent),
        content: noteContent,
      };
      notes.push(note);
    }
    console.log("Finished loading " + notes.length + " notes");

    return notes;
  }

  _getFiles() {
    const exFolders = prefExcludedFolders();
    const files = walkFilesHelper(this.vaultPath, exFolders, [".md"], []);
    return files;
  }
}

export class MediaLoader {
  vaultPath: string;

  constructor(vault: Vault) {
    this.vaultPath = vault.path;
  }

  _getFiles() {
    const exFolders = prefExcludedFolders();
    const files = walkFilesHelper(
      this.vaultPath,
      exFolders,
      [...AUDIO_FILE_EXTENSIONS, ...VIDEO_FILE_EXTENSIONS, ".jpg", ".png", ".gif", ".mp4", ".pdf"],
      []
    );
    return files;
  }

  loadMedia() {
    const medias: Media[] = [];
    const files = this._getFiles();

    for (const f of files) {
      const icon = this.getIconFor(f);

      const media: Media = {
        title: path.basename(f),
        path: f,
        icon: icon,
      };
      medias.push(media);
    }
    return medias;
  }

  getIconFor(pathStr: string) {
    const ext = path.extname(pathStr);
    if (VIDEO_FILE_EXTENSIONS.includes(ext)) {
      return { source: Icon.Video };
    } else if (AUDIO_FILE_EXTENSIONS.includes(ext)) {
      return { source: Icon.Microphone };
    }

    return { source: pathStr };
  }
}
