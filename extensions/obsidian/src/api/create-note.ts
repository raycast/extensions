import { confirmAlert, getPreferenceValues, Icon, open } from "@raycast/api";
import path from "path";
import fs from "fs";
import { NoteFormPreferences } from "../utils/preferences";
import { directoryCreationErrorToast, fileWriteErrorToast } from "../components/Toasts";
import { ObsidianUtils, ObsidianVault, Vault } from "../obsidian";
import { applyTemplates } from "./templating/templating.service";

export interface CreateNoteParams {
  path: string;
  name: string;
  content: string;
  tags: string[];
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
export async function createNote(vault: ObsidianVault, params: CreateNoteParams) {
  const pref = getPreferenceValues<NoteFormPreferences>();
  const fillDefaults = !pref.fillFormWithDefaults && params.content.length == 0;

  let name = params.name == "" ? pref.prefNoteName : params.name;
  let content = fillDefaults ? pref.prefNoteContent || "" : params.content;

  content = ObsidianUtils.createProperties(params.tags) + content;
  content = await applyTemplates(content);
  name = await applyTemplates(name);

  const saved = await createNoteWithConfirmation(vault.path, content, name, params.path);

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

/**
 * Saves a string to disk with filename name.
 *
 * @param content - The content of the note
 * @param name - The name of the note
 * @returns - True if the note was saved successfully
 */
async function createNoteWithConfirmation(vaultPath: string, content: string, name: string, notePath: string) {
  const fullPath = path.join(vaultPath, notePath);

  if (fs.existsSync(path.join(fullPath, name + ".md"))) {
    if (
      await confirmAlert({
        title: "Override note",
        message: 'Are you sure you want to override the note: "' + name + '"?',
        icon: Icon.ExclamationMark,
      })
    ) {
      Vault.writeMarkdown(fullPath, name, content, directoryCreationErrorToast, fileWriteErrorToast);
      return true;
    }
    return false;
  } else {
    Vault.writeMarkdown(fullPath, name, content, directoryCreationErrorToast, fileWriteErrorToast);
    return true;
  }
}
