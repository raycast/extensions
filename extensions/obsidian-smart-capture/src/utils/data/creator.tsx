import { showToast, Toast, confirmAlert, Icon, open } from "@raycast/api";
import path from "path";
import fs from "fs";

import { FormValue, Vault } from "../interfaces";
import { applyTemplates } from "../utils";
import { directoryCreationErrorToast, fileWriteErrorToast } from "../../components/Toasts";
import { NoteFormPreferences } from "../preferences";

class NoteCreator {
  vaultPath: string;
  noteProps: FormValue;
  pref: NoteFormPreferences;

  /**
   * Creates notes in a vault.
   *
   * @param noteProps - Path, name, content and tags from a form
   * @param vault - The vault to create the note in
   * @param pref - The preferences for the note form command
   */
  constructor(noteProps: FormValue, vault: Vault, pref: NoteFormPreferences) {
    this.vaultPath = vault.path;
    this.noteProps = noteProps;
    this.pref = pref;
  }

  /**
   * Creates a note in the vault by adding a YAML frontmatter, applyin templates to the content and name and then saving the note. Can open the note in obsidian if the preference is set.
   *
   * @returns True if the note was created successfully
   */

  async createNote() {
    const fillDefaults = !this.pref.fillFormWithDefaults && this.noteProps.content.length == 0;

    let name = this.noteProps.name == "" ? this.pref.prefNoteName : this.noteProps.name;
    let content = fillDefaults ? this.pref.prefNoteContent : this.noteProps.content;

    console.log(this.noteProps.content);

    content = this.addYAMLFrontmatter(content);
    content = await applyTemplates(content);
    name = await applyTemplates(name);

    const saved = await this.saveNote(content, name);

    if (this.pref.openOnCreate) {
      const target =
        "obsidian://open?path=" + encodeURIComponent(path.join(this.vaultPath, this.noteProps.path, name + ".md"));
      if (saved) {
        setTimeout(() => {
          open(target);
        }, 200);
      }
    }
    return saved;
  }

  /**
   * Adds YAML frontmatter to the beginning of the note content.
   *
   * @param content - The content of the note
   * @returns The content with YAML frontmatter
   */
  addYAMLFrontmatter(content: string) {
    if (this.noteProps.tags.length > 0) {
      content = "---\ntags: [";
      for (let i = 0; i < this.noteProps.tags.length - 1; i++) {
        content += '"' + this.noteProps.tags[i] + '",';
      }
      content += '"' + this.noteProps.tags.pop() + '"]\n---\n';
      content += this.noteProps.content;
    }

    return content;
  }

  /**
   * Saves a string to disk with filename name.
   *
   * @param content - The content of the note
   * @param name - The name of the note
   * @returns - True if the note was saved successfully
   */
  async saveNote(content: string, name: string) {
    const notePath = path.join(this.vaultPath, this.noteProps.path);

    if (fs.existsSync(path.join(notePath, name + ".md"))) {
      const options = {
        title: "Override note",
        message: 'Are you sure you want to override the note: "' + name + '"?',
        icon: Icon.ExclamationMark,
      };
      if (await confirmAlert(options)) {
        this.writeToFile(notePath, name, content);
        return true;
      }
    } else {
      this.writeToFile(notePath, name, content);
      return true;
    }
  }

  /**
   * Writes a string to a file with filename name.
   *
   * @param notePath - The path to the note
   * @param name - The name of the note
   * @param content - The content of the note
   * @returns - True if the note was saved successfully
   * @throws - Shows a toast if the file could not be written
   */

  writeToFile(notePath: string, name: string, content: string) {
    try {
      fs.mkdirSync(notePath, { recursive: true });
    } catch {
      directoryCreationErrorToast(notePath);
      return;
    }
    try {
      fs.writeFileSync(path.join(notePath, name + ".md"), content);
    } catch {
      fileWriteErrorToast(notePath, name);
      return;
    }
    showToast({ title: "Note created", style: Toast.Style.Success });
  }
}

export default NoteCreator;
