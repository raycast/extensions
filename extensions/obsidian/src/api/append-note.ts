import { Note, Vault } from "@/obsidian";
import { SearchNotePreferences } from "@/utils/preferences";
import { getPreferenceValues, getSelectedText, showToast, Toast } from "@raycast/api";
import { applyTemplates } from "./templating/templating.service";

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
      Vault.appendToNote(note, content);
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
