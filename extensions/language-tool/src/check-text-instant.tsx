import { Clipboard, showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { applyAllCorrections } from "./utils/text-correction";
import { checkTextWithAPI } from "./services/languagetool-api";

interface Preferences {
  level?: "" | "default" | "picky";
  disabledRules?: string;
  enableHiddenRules?: boolean;
  noopLanguages?: string;
  abtest?: string;
  mode?: "" | "allButTextLevelOnly" | "textLevelOnly";
  allowIncompleteResults?: boolean;
  useragent?: "" | "standalone";
}

/**
 * Comando que lê texto do clipboard, verifica e cola o resultado corrigido
 * Executa instantaneamente sem UI
 */
export default async function Command() {
  try {
    // Lê texto do clipboard
    const text = await Clipboard.readText();

    if (!text || text.trim().length === 0) {
      await showToast({
        title: "No text found",
        message: "Please copy some text to check",
        style: Toast.Style.Failure,
      });
      return;
    }

    // Mostra loading
    await showToast({
      title: "Checking text...",
      style: Toast.Style.Animated,
    });

    // Pega preferências globais
    const preferences = getPreferenceValues<Preferences>();

    // Usa serviço centralizado (inclui credenciais Premium automaticamente)
    const result = await checkTextWithAPI({
      text: text,
      language: "auto",
      level: preferences.level,
      disabledRules: preferences.disabledRules,
      enableHiddenRules: preferences.enableHiddenRules,
      noopLanguages: preferences.noopLanguages,
      abtest: preferences.abtest,
      mode: preferences.mode,
      allowIncompleteResults: preferences.allowIncompleteResults,
      useragent: preferences.useragent,
    });

    // Aplica todas as correções usando função utilitária pura
    const correctedText = applyAllCorrections(text, result);

    // Cola o texto corrigido
    await Clipboard.paste(correctedText);

    // Feedback
    const matchesCount = result.matches?.length || 0;
    await showToast({
      title: matchesCount > 0 ? `Fixed ${matchesCount} issues` : "No issues found",
      message: "Corrected text pasted",
      style: Toast.Style.Success,
    });

    // Fecha a janela do Raycast
    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: "Error checking text",
      message: error instanceof Error ? error.message : "Unknown error",
      style: Toast.Style.Failure,
    });
  }
}
