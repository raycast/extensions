import { confirmAlert, getPreferenceValues, getSelectedText, Icon, open, showToast, Toast } from "@raycast/api";
import { NoteFormPreferences, SearchNotePreferences } from "../../../utils/preferences";
import fs from "fs";
import { CodeBlock, CreateNoteParams, Note } from "./notes.types";
import { Vault } from "../vault.types";
import path from "path";
import { directoryCreationErrorToast, fileWriteErrorToast } from "../../../components/Toasts";
import { CODE_BLOCK_REGEX } from "../../../utils/constants";
import { applyTemplates } from "../../templating/templating.service";

export async function appendSelectedTextTo(note: Note) {
  let { appendSelectedTemplate } = getPreferenceValues<SearchNotePreferences>();

  appendSelectedTemplate = appendSelectedTemplate ? appendSelectedTemplate : "{content}";

  try {
    const selectedText = await getSelectedText();
    if (selectedText.trim() == "") {
      showToast({ title: "No text selected", message: "Make sure to select some text.", style: Toast.Style.Failure });
    } else {
      let content = appendSelectedTemplate.replaceAll("{content}", selectedText);
      content = await applyTemplates(content);
      fs.appendFileSync(note.path, "\n" + content);
      showToast({ title: "Added selected text to note", style: Toast.Style.Success });
      return true;
    }
  } catch {
    showToast({
      title: "Couldn't copy selected text",
      message: "Maybe you didn't select anything.",
      style: Toast.Style.Failure,
    });
  }
}

export function getCodeBlocks(content: string): CodeBlock[] {
  const codeBlockMatches = content.matchAll(CODE_BLOCK_REGEX);
  const codeBlocks = [];
  for (const codeBlockMatch of codeBlockMatches) {
    const [, language, code] = codeBlockMatch;
    codeBlocks.push({ language, code });
  }
  return codeBlocks;
}

/**
 * Creates a note in the vault.
 * - Adds a YAML frontmatter
 * - applys templates to the content and name
 * - saves the note
 *
 * Can open the note in obsidian if the preference is set.
 *
 * @returns True if the note was created successfully
 */

export async function createNote(vault: Vault, params: CreateNoteParams) {
  const pref = getPreferenceValues<NoteFormPreferences>();
  const fillDefaults = !pref.fillFormWithDefaults && params.content.length == 0;

  let name = params.name == "" ? pref.prefNoteName : params.name;
  let content = fillDefaults ? pref.prefNoteContent : params.content;

  console.log(params.content);

  content = createObsidianProperties(params.tags) + content;
  content = await applyTemplates(content);
  name = await applyTemplates(name);

  const saved = await saveStringToDisk(vault.path, content, name, params.path);

  if (pref.openOnCreate) {
    const target = "obsidian://open?path=" + encodeURIComponent(path.join(vault.path, params.path, name + ".md"));
    if (saved) {
      setTimeout(() => {
        open(target);
      }, 200);
    }
  }
  return saved;
}

/** Gets the Obsidian Properties YAML frontmatter for a list of tags */
function createObsidianProperties(tags: string[]): string {
  let obsidianProperties = "";
  if (tags.length > 0) {
    obsidianProperties = "---\ntags: [";
    for (let i = 0; i < tags.length - 1; i++) {
      obsidianProperties += '"' + tags[i] + '",';
    }
    obsidianProperties += '"' + tags[tags.length - 1] + '"]\n---\n';
  }

  return obsidianProperties;
}

/**
 * Saves a string to disk with filename name.
 *
 * @param content - The content of the note
 * @param name - The name of the note
 * @returns - True if the note was saved successfully
 */
async function saveStringToDisk(vaultPath: string, content: string, name: string, notePath: string) {
  const fullPath = path.join(vaultPath, notePath);

  if (fs.existsSync(path.join(fullPath, name + ".md"))) {
    if (
      await confirmAlert({
        title: "Override note",
        message: 'Are you sure you want to override the note: "' + name + '"?',
        icon: Icon.ExclamationMark,
      })
    ) {
      writeTextToMarkdownFile(fullPath, name, content);
      return true;
    }
    return false;
  } else {
    writeTextToMarkdownFile(fullPath, name, content);
    return true;
  }
}

/** Writes a text to a markdown file at filePath with a given fileName. */
function writeTextToMarkdownFile(filePath: string, fileName: string, text: string) {
  try {
    fs.mkdirSync(filePath, { recursive: true });
  } catch {
    directoryCreationErrorToast(filePath);
    return;
  }
  try {
    fs.writeFileSync(path.join(filePath, fileName + ".md"), text);
  } catch {
    fileWriteErrorToast(filePath, fileName);
    return;
  }
  showToast({ title: "Note created", style: Toast.Style.Success });
}

export function isNote(note: Note | undefined): note is Note {
  return (note as Note) !== undefined;
}

export function deleteNote(note: Note) {
  if (!fs.existsSync(note.path)) {
    return;
  }
  fs.unlinkSync(note.path);
  showToast({ title: "Deleted Note", style: Toast.Style.Success });
  return true;
}
