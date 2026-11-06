import { confirmAlert, getPreferenceValues, Icon } from "@raycast/api";
import path from "path";
import fs from "fs";
import { NoteFormPreferences } from "../utils/preferences";
import { directoryCreationErrorToast, fileWriteErrorToast } from "../components/Toasts";
import { ObsidianUtils, ObsidianVault, Vault } from "../obsidian";
import { applyTemplates } from "./templating/templating.service";
import { openUrl } from "../utils/open";

export interface CreateNoteParams {
  path: string;
  name: string;
  content: string;
  tags: string[];
}

export async function createNote(vault: ObsidianVault, params: CreateNoteParams): Promise<boolean> {
  const pref = getPreferenceValues<NoteFormPreferences>();
  const fillDefaults = !pref.fillFormWithDefaults && params.content.length == 0;

  let name = params.name == "" ? pref.prefNoteName : params.name;
  let content = fillDefaults ? pref.prefNoteContent || "" : params.content;

  content = ObsidianUtils.createProperties(params.tags) + content;
  content = await applyTemplates(content);
  name = await applyTemplates(name);

  const saved = await createNoteWithConfirmation(vault.path, content, name, params.path);

  if (pref.openOnCreate && saved) {
    const target = "obsidian://open?path=" + encodeURIComponent(path.join(vault.path, params.path, name + ".md"));
    try {
      await openUrl(target);
    } catch {
      // The note is already saved; a failed open must not mask the save or skip cache invalidation.
    }
  }
  return saved;
}

async function createNoteWithConfirmation(
  vaultPath: string,
  content: string,
  name: string,
  notePath: string
): Promise<boolean> {
  const fullPath = path.join(vaultPath, notePath);

  if (fs.existsSync(path.join(fullPath, name + ".md"))) {
    if (
      await confirmAlert({
        title: "Override note",
        message: 'Are you sure you want to override the note: "' + name + '"?',
        icon: Icon.ExclamationMark,
      })
    ) {
      return Vault.writeMarkdown(fullPath, name, content, directoryCreationErrorToast, fileWriteErrorToast);
    }
    return false;
  } else {
    return Vault.writeMarkdown(fullPath, name, content, directoryCreationErrorToast, fileWriteErrorToast);
  }
}
