import { showToast, Toast, confirmAlert, Icon, open } from "@raycast/api";
import path from "path";
import fs from "fs";

import { NoteFormPreferences, FormValue, Vault } from "./interfaces";
import { applyTemplates } from "./utils";

class NoteCreator {
  vaultPath: string;
  noteProps: FormValue;
  saved = false;
  pref: NoteFormPreferences;

  constructor(noteProps: FormValue, vault: Vault, pref: NoteFormPreferences) {
    this.vaultPath = vault.path;
    this.noteProps = noteProps;
    this.pref = pref;
  }

  async createNote() {
    if (this.noteProps.name == "") {
      this.noteProps.name = this.pref.prefNoteName;
    }
    let content = this.addYAMLFrontmatter("");
    content = await applyTemplates(content);
    const name = await applyTemplates(this.noteProps.name);

    this.saveNote(content, name);

    if (this.pref.openOnCreate) {
      const target =
        "obsidian://open?path=" + encodeURIComponent(path.join(this.vaultPath, this.noteProps.path, name + ".md"));
      open(target);
    }
    return this.saved;
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
      }
    } else {
      this.writeToFile(notePath, name, content);
    }
  }

  writeToFile(notePath: string, name: string, content: string) {
    try {
      try {
        fs.mkdirSync(notePath, { recursive: true });
      } catch {
        showToast({
          title: "Couldn't create directories for the given path:",
          message: notePath,
          style: Toast.Style.Failure,
        });
        return;
      }
      try {
        fs.writeFileSync(path.join(notePath, name + ".md"), content);
      } catch {
        showToast({
          title: "Couldn't write to file:",
          message: notePath + "/" + name + ".md",
          style: Toast.Style.Failure,
        });
        return;
      }
      showToast({ title: "Note created", style: Toast.Style.Success });
      this.saved = true;
    } catch {
      showToast({
        title: "Something went wrong",
        message: " Maybe your vault, path or filename is not valid",
        style: Toast.Style.Failure,
      });
    }
  }
}

export default NoteCreator;
