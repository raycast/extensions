import { getSelectedText, LocalStorage, showToast, Toast, type LaunchProps } from "@raycast/api";
import { createApiClient, getAccessToken } from "./api";
import { formatRaycastError, getAuthIdentityFromToken } from "./utils";
import {
  invalidateLearningItemsCache,
  invalidateLookupCache,
  invalidateUserProfileCache,
} from "./features/shared/query-keys";

export default async function QuickAddWord({
  arguments: args,
  fallbackText,
}: LaunchProps<{ arguments: Arguments.QuickAddWord }>) {
  const directText = normalizeText(args.text);
  const selectedText = await readSelectedText();
  const text = directText ?? selectedText ?? normalizeText(fallbackText);

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text provided",
      message: "Pass a word or phrase directly, select text in the frontmost app, or launch from root search.",
    });
    return;
  }

  const token = await getAccessToken();
  if (!token) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not signed in",
      message: "Open any Polidict command to sign in first.",
    });
    return;
  }

  const languageCode = await resolveCurrentLanguageCode(token);
  if (!languageCode) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No study language",
      message: "Open Polidict and set up a study language first.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding word…",
    message: text,
  });

  try {
    const client = createApiClient();
    await client.learningItems.addLearningItem(languageCode, { text });

    const authIdentity = getAuthIdentityFromToken(token);
    invalidateLearningItemsCache(authIdentity, languageCode);
    invalidateLookupCache(authIdentity, languageCode);
    invalidateUserProfileCache(authIdentity);

    toast.style = Toast.Style.Success;
    toast.title = "Word added";
    toast.message = text;
  } catch (error) {
    const userError = formatRaycastError(error);
    toast.style = Toast.Style.Failure;
    toast.title = userError.title;
    toast.message = userError.description;
  }
}

async function resolveCurrentLanguageCode(token: string): Promise<string | null> {
  const stored = await findStoredLanguageCode(token);
  if (stored) return stored;

  const client = createApiClient();
  const languages = await client.languages.getUserLanguages();
  return languages[0]?.languageCode ?? null;
}

async function findStoredLanguageCode(token: string): Promise<string | null> {
  const authIdentity = getAuthIdentityFromToken(token);
  const scopedKey = `currentLanguage:${authIdentity}`;

  const scoped = await LocalStorage.getItem<string>(scopedKey);
  if (scoped) return scoped;

  const legacy = await LocalStorage.getItem<string>("currentLanguage");
  return legacy ?? null;
}

async function readSelectedText(): Promise<string | undefined> {
  try {
    return normalizeText(await getSelectedText());
  } catch {
    return undefined;
  }
}

function normalizeText(text?: string): string | undefined {
  const trimmed = text?.trim().replace(/\s+/g, " ");
  return trimmed || undefined;
}
