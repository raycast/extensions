import {
  AI,
  Clipboard,
  environment,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { OpenAIModule } from "./utils/grammerUtil";
import { addChatToHistory } from "./utils/historyUtil";
import { CommandType, ToneType } from "./types";
import { getAccessToken, getIsHistoryPaused } from "./utils";

const ACTION_LABELS: Record<CommandType, string> = {
  [CommandType.Fix]: "Fix Grammar",
  [CommandType.Paraphrase]: "Paraphrase",
  [CommandType.ToneChange]: "Change Tone",
  [CommandType.ContinueText]: "Continue Text",
};

type QuickFixPreferences = {
  quickAction: CommandType;
  quickTone: ToneType;
};

async function getInputText(): Promise<{ text: string; fromSelection: boolean }> {
  try {
    const selected = await getSelectedText();
    if (selected && selected.trim()) return { text: selected, fromSelection: true };
  } catch {
    // no selection available, fall back to the clipboard
  }

  const clipboard = await Clipboard.readText();
  if (clipboard && clipboard.trim()) return { text: clipboard, fromSelection: false };

  return { text: "", fromSelection: false };
}

export default async function Command() {
  const openAIKey = getAccessToken();

  if (!openAIKey && !environment.canAccess(AI)) {
    await showHUD("❌ Add an OpenAI key or a Raycast Pro subscription");
    return;
  }

  const { text, fromSelection } = await getInputText();
  if (!text) {
    await showHUD("❌ Nothing to fix — select some text first");
    return;
  }

  const { quickAction, quickTone } = getPreferenceValues<QuickFixPreferences>();
  const openAI = new OpenAIModule(openAIKey);

  try {
    await showHUD("✍️ Improving text…", { clearRootSearch: true });

    let output: string;
    switch (quickAction) {
      case CommandType.Paraphrase:
        output = await openAI.paraphraseGrammer(text);
        break;
      case CommandType.ToneChange:
        output = await openAI.changeTone(text, quickTone);
        break;
      case CommandType.ContinueText:
        output = await openAI.continueText(text);
        break;
      default:
        output = await openAI.fixGrammer(text);
    }

    output = output.trim();
    if (!output) {
      await showHUD("❌ Got an empty result");
      return;
    }

    if (fromSelection) {
      await Clipboard.paste(output);
      await showHUD("✅ Text replaced");
    } else {
      await Clipboard.copy(output);
      await showHUD("✅ Copied to clipboard (no selection found)");
    }

    if (!getIsHistoryPaused()) {
      await addChatToHistory({
        id: uuidv4(),
        question: text.trim(),
        answer: output,
        created_at: new Date().toISOString(),
      });
    }

    await updateCommandMetadata({ subtitle: ACTION_LABELS[quickAction] ?? ACTION_LABELS[CommandType.Fix] });
  } catch (error) {
    await showHUD(`❌ ${String(error)}`);
  }
}
