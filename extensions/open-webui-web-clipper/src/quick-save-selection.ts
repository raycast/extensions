import { LocalStorage, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { buildPrompt, capture, chatTitleFromClip } from "./capture";
import { OpenWebUIClient } from "./openwebui";
import { DEFAULT_MODEL_KEY, LAST_FOLDER_KEY, shouldOpenAfterQuickSave } from "./settings";
import type { PreferencesShape } from "./types";

async function resolveModel(client: OpenWebUIClient, preferred?: string): Promise<string> {
  const models = await client.getModels();
  if (preferred && models.some((model) => model.id === preferred)) return preferred;
  const fallback = models[0]?.id;
  if (!fallback) throw new Error("Open WebUI returned no available models.");
  return fallback;
}

export default async function Command() {
  const prefs = getPreferenceValues<PreferencesShape>();
  const folderId = await LocalStorage.getItem<string>(LAST_FOLDER_KEY);
  if (!folderId) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Folder Selected Yet",
      message: "Run “Send Web Content” once and choose a folder. Save Page and Save Selection will reuse it automatically.",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Selection and Starting Model…" });
  try {
    const client = new OpenWebUIClient(prefs);
    const clip = await capture("selection");
    const preferredModel = await LocalStorage.getItem<string>(DEFAULT_MODEL_KEY);
    const model = await resolveModel(client, preferredModel);
    const prompt = buildPrompt(clip, "discuss");
    const result = await client.startQuickChat(folderId, model, prompt, chatTitleFromClip(clip), clip);

    toast.style = Toast.Style.Success;
    toast.title = result.warnings.length ? "Chat Created With Warning" : "Selection Saved, Model Started";
    toast.message = result.warnings[0] || result.chat.title || chatTitleFromClip(clip);

    if (shouldOpenAfterQuickSave(prefs.openAfterSendMode)) await open(client.chatUrl(result.chat.id));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Save Selection";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
