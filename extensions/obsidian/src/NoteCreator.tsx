import { showToast, ToastStyle, AlertOptions, confirmAlert, Icon } from "@raycast/api";
import fs from "fs";
import path from "path";

interface FormValue {
  path: string;
  name: string;
  content: string;
  tags: Array<string>;
}

class NoteCreator {
  vaultPath: string;
  noteProps: FormValue;
  saved = false;

  constructor(noteProps: FormValue, vaultPath: string) {
    this.vaultPath = vaultPath;
    this.noteProps = noteProps;
  }

  createNote() {
    if (this.noteProps.name == "") {
      showToast(ToastStyle.Failure, "Please enter a name");
    } else {
      const content = this.buildNoteContent();
      this.saveNote(content);
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
      const options: AlertOptions = {
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
        showToast(ToastStyle.Failure, "Couldn't create folder structure for the given path.");
        return;
      }
      try {
        fs.writeFileSync(path.join(notePath, this.noteProps.name + ".md"), content);
      } catch {
        showToast(ToastStyle.Failure, "Couldn't write the file: " + notePath + "/" + this.noteProps.name + ".md");
        return;
      }
      showToast(ToastStyle.Success, "Created new note");
      this.saved = true;
    } catch {
      showToast(ToastStyle.Failure, "Something went wrong. Maybe your vault, path or filename is not valid.");
    }
  }
}

export default NoteCreator;
