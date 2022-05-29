import { showToast, Toast, confirmAlert, Icon, open, getPreferenceValues } from "@raycast/api";

import path from "path";
import fs from "fs";
import { NoteFormPreferences } from "./interfaces";

interface FormValue {
  path: string;
  name: string;
  content: string;
  tags: string[];
}

class NoteCreator {
  vaultPath: string;
  noteProps: FormValue;
  saved = false;
  openOnCreation: boolean;

  constructor(noteProps: FormValue, vaultPath: string, openOnCreation: boolean) {
    this.vaultPath = vaultPath;
    this.noteProps = noteProps;
    this.openOnCreation = openOnCreation;
  }

  createNote() {
    if (this.noteProps.name == "") {
      const pref: NoteFormPreferences = getPreferenceValues();
      this.noteProps.name = pref.prefNoteName;
    }
    const content = this.buildNoteContent();
    this.saveNote(content);
    if (this.openOnCreation) {
      const target =
        "obsidian://open?path=" +
        encodeURIComponent(path.join(this.vaultPath, this.noteProps.path, this.noteProps.name + ".md"));
      open(target);
    }
    return this.saved;
  }

  buildNoteContent() {
    let content = "";
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

  async saveNote(content: string) {
    const notePath = path.join(this.vaultPath, this.noteProps.path);

    if (fs.existsSync(path.join(notePath, this.noteProps.name + ".md"))) {
      const options = {
        title: "Override note",
        message: 'Are you sure you want to override the note: "' + this.noteProps.name + '"?',
        icon: Icon.ExclamationMark,
      };
      if (await confirmAlert(options)) {
        this.writeToFile(notePath, content);
      }
    } else {
      this.writeToFile(notePath, content);
    }
  }

  writeToFile(notePath: string, content: string) {
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
        fs.writeFileSync(path.join(notePath, this.noteProps.name + ".md"), content);
      } catch {
        showToast({
          title: "Couldn't write to file:",
          message: notePath + "/" + this.noteProps.name + ".md",
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
