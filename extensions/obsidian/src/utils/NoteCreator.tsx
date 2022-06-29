import { showToast, Toast, confirmAlert, Icon, open, getPreferenceValues, Clipboard } from "@raycast/api";

import path from "path";
import fs from "fs";
import { NoteFormPreferences, FormValue } from "./interfaces";
import { monthMapping, dayMapping } from "./utils";

class NoteCreator {
  vaultPath: string;
  noteProps: FormValue;
  saved = false;
  pref: NoteFormPreferences;

  constructor(noteProps: FormValue, vaultPath: string, pref: NoteFormPreferences) {
    this.vaultPath = vaultPath;
    this.noteProps = noteProps;
    this.pref = pref;
  }

  createNote() {
    if (this.noteProps.name == "") {
      this.noteProps.name = this.pref.prefNoteName;
    }
    const content = this.buildNoteContent();
    const name = this.applyTemplates(this.noteProps.name);
    this.saveNote(content, name);
    if (this.pref.openOnCreate) {
      const target =
        "obsidian://open?path=" + encodeURIComponent(path.join(this.vaultPath, this.noteProps.path, name + ".md"));
      open(target);
    }
    return this.saved;
  }

  applyTemplates(content: string) {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    const timestamp = Date.now().toString();

    content = content.replaceAll("{time}", date.toLocaleTimeString());
    content = content.replaceAll("{date}", date.toLocaleDateString());

    content = content.replaceAll("{year}", date.getFullYear().toString());
    content = content.replaceAll("{month}", monthMapping[date.getMonth()]);
    content = content.replaceAll("{day}", dayMapping[date.getDay()]);

    content = content.replaceAll("{hour}", hours);
    content = content.replaceAll("{minute}", minutes);
    content = content.replaceAll("{second}", seconds);
    content = content.replaceAll("{millisecond}", date.getMilliseconds().toString());

    content = content.replaceAll("{timestamp}", timestamp);
    content = content.replaceAll("{zettelkastenID}", timestamp);

    return content;
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
    content = this.applyTemplates(content);

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
