import { showToast, Toast, confirmAlert, Icon, open } from "@raycast/api";
import path from "path";
import fs from "fs";

import { NoteFormPreferences, FormValue, Vault } from "./interfaces";
import { applyTemplates } from "./utils";
import { directoryCreationErrorToast, fileWriteErrorToast } from "../components/Toasts";

class NoteCreator {
  vaultPath: string;
  noteProps: FormValue;
  pref: NoteFormPreferences;

  constructor(noteProps: FormValue, vault: Vault, pref: NoteFormPreferences) {
    this.vaultPath = vault.path;
    this.noteProps = noteProps;
    this.pref = pref;
  }

  async createNote() {
    let name = this.noteProps.name == "" ? this.pref.prefNoteName : this.noteProps.name;
    let content = this.pref.prefNoteContent;

    content = this.addYAMLFrontmatter(content);
    content = await applyTemplates(content);
    name = await applyTemplates(name);

    const saved = await this.saveNote(content, name);

    if (this.pref.openOnCreate) {
      const target =
        "obsidian://open?path=" + encodeURIComponent(path.join(this.vaultPath, this.noteProps.path, name + ".md"));
      if (saved) {
        open(target);
      }
    }
    return saved;
  }

  addYAMLFrontmatter(content: string) {
    if (this.noteProps.tags.length > 0) {
      content = "---\ntags: [";
      for (let i = 0; i < this.noteProps.tags.length - 1; i++) {
        content += '"' + this.noteProps.tags[i] + '",';
      }
      content += '"' + this.noteProps.tags.pop() + '"]\n---\n';
    }
    content += this.noteProps.content;

    return content;
  }

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
