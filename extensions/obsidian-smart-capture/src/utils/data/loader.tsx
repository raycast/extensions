import { Icon } from "@raycast/api";
import path from "path";

import { AUDIO_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from "../constants";
import { Note, Vault, Media } from "../interfaces";
import {
  getNoteFileContent,
  getBookmarkedNotePaths,
  getUserIgnoreFilters,
  prefExcludedFolders,
  walkFilesHelper,
} from "../utils";
import { tagsForString } from "../yaml";

export class NoteLoader {
  vault: Vault;

  /**
   * Loads notes for a given vault from disk. cache.useNotes() is the preferred way of loading notes.
   *
   * @param vault
   */
  constructor(vault: Vault) {
    this.vault = vault;
  }

  /**
   *
   * @returns A list of notes for the vault
   */
  loadNotes() {
    console.log("Loading Notes for vault: " + this.vault.path);
    const notes: Note[] = [];
    const files = this._getFiles();
    const bookmarked = getBookmarkedNotePaths(this.vault);

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
        tags: tagsForString(noteContent),
        content: noteContent,
        bookmarked: bookmarked.includes(f.split(this.vault.path)[1].slice(1)),
      };

      notes.push(note);
    }
    console.log("Finished loading " + notes.length + " notes");

    return notes;
  }

  /**
   * Returns a list of file paths for all notes.
   * @internal
   * @returns A list of file paths for all notes
   */
  _getFiles() {
    const exFolders = prefExcludedFolders();
    const userIgnoredFolders = getUserIgnoreFilters(this.vault);
    exFolders.push(...userIgnoredFolders);
    const files = walkFilesHelper(this.vault.path, exFolders, [".md"], []);
    return files;
  }
}

export class MediaLoader {
  vaultPath: string;

  /**
   * Loads media (images, pdfs, video, audio, etc.) for a given vault from disk. utils.useMedia() is the preferred way of loading media.
   * @param vault
   */
  constructor(vault: Vault) {
    this.vaultPath = vault.path;
  }

  /**
   * Returns a list of file paths for all media.
   * @internal
   * @returns A list of file paths for all media
   */
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

  /**
   *
   * @returns A list of media for the vault
   */
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

  /**
   * Returns the icon for a given file path. This is used to determine the icon for a media item where the media itself can't be displayed (e.g. video, audio).
   *
   * @param pathStr - The file path to get the icon for
   * @returns An icon for the given file path
   */
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
