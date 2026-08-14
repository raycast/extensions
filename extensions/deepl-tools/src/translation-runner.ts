import {
  Clipboard,
  environment,
  LaunchProps,
  LaunchType,
  LocalStorage,
  Toast,
  closeMainWindow,
  getSelectedText,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { translate } from "./deepl";
import { isCompactText, previewText } from "./translation-display";
import { CompletedTranslation, createTranslationStorageKey } from "./translation-payload";
import { getConfiguredPreferences } from "./preferences";

type TranslateArguments = {
  text?: string;
};

type TranslateProps = LaunchProps<{ arguments: TranslateArguments }>;

function getArgumentText(props: TranslateProps) {
  return ((props.arguments as Partial<TranslateArguments> | undefined)?.text || props.fallbackText || "").trim();
}

async function getSourceText(props: TranslateProps) {
  try {
    const selectedText = (await getSelectedText()).trim();
    if (selectedText) {
      return selectedText;
    }
  } catch {
    // No selected text is expected when the command is launched from Raycast.
  }

  const argumentText = getArgumentText(props);
  if (argumentText) {
    return argumentText;
  }

  const clipboardText = (await Clipboard.readText())?.trim();
  if (clipboardText) {
    return clipboardText;
  }

  return "";
}

async function openTranslationView(translation: CompletedTranslation) {
  const storageKey = createTranslationStorageKey();
  await LocalStorage.setItem(storageKey, JSON.stringify(translation));
  await launchCommand({
    name: "translate-text",
    type: LaunchType.UserInitiated,
    context: { storageKey },
  });
}

async function showNativeToast(text: string) {
  const toastBinaryPath = path.join(environment.assetsPath, "translation-toast");
  if (!existsSync(toastBinaryPath)) {
    await showHUD(text);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(toastBinaryPath, [text], {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function showCompactTranslation(text: string) {
  const toastText = previewText(text);
  try {
    await showNativeToast(toastText);
  } catch {
    await showHUD(toastText);
  }
}

async function translateAndShow(sourceText: string) {
  const preferences = await getConfiguredPreferences();
  if (!preferences) {
    await launchCommand({ name: "configure-languages", type: LaunchType.UserInitiated });
    return;
  }
  const sourceIsCompact = isCompactText(sourceText);

  if (sourceIsCompact) {
    await closeMainWindow({ clearRootSearch: true });
  }

  try {
    const result = await translate(sourceText, preferences);

    if (isCompactText(sourceText) || isCompactText(result.translatedText)) {
      if (!sourceIsCompact) {
        await closeMainWindow({ clearRootSearch: true });
      }

      await showCompactTranslation(result.translatedText);
      return;
    }

    await openTranslationView({
      sourceText,
      translatedText: result.translatedText,
      sourceLang: result.sourceLang,
      targetLang: result.targetLang,
      rule: result.rule,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't translate text" });
  }
}

export async function runTranslationCommand(props: TranslateProps) {
  const sourceText = await getSourceText(props);

  if (!sourceText) {
    await showToast({ style: Toast.Style.Failure, title: "No selected text or clipboard text" });
    return;
  }

  await translateAndShow(sourceText);
}

export async function runClipboardTranslationCommand() {
  const sourceText = (await Clipboard.readText())?.trimEnd();

  if (!sourceText) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
    return;
  }

  await translateAndShow(sourceText);
}
