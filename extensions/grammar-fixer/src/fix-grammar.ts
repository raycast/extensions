import {
  AI,
  Clipboard,
  environment,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { generateText } from "ai";
import { BASE_SYSTEM_PROMPT, LOADING_MESSAGES } from "./constants";
import { cacheKey, getCached, setCached } from "./helpers/cache";
import { formatError } from "./helpers/errors";
import { buildModel } from "./helpers/model";

function buildSystemPrompt(userInstruction?: string): string {
  if (!userInstruction?.trim()) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\nAdditional instructions: ${userInstruction.trim()}`;
}

const randomLoadingMessage = () =>
  LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    await showHUD("No text selected — select some text and try again");
    return;
  }

  if (!text.trim()) {
    await showHUD("Selected text is empty");
    return;
  }
  const systemPrompt = buildSystemPrompt(prefs.userInstruction);
  const key = cacheKey(text, systemPrompt);
  const cached = getCached(key);

  if (cached) {
    await Clipboard.paste(cached);
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: randomLoadingMessage(),
  });

  try {
    let fixed: string;

    if (prefs.useRaycastAI && environment.canAccess(AI)) {
      fixed = await AI.ask(`${systemPrompt}\n\nText to fix:\n${text}`, {
        creativity: "none",
        model:
          (prefs.model?.trim() as AI.Model) || AI.Model["OpenAI_GPT-4.1_nano"],
      });
    } else {
      const { text: result } = await generateText({
        model: buildModel(prefs),
        system: systemPrompt,
        prompt: text,
        temperature: 0,
      });
      fixed = result;
    }

    if (!fixed.trim())
      throw new Error("Model returned an empty response. Try again.");

    setCached(key, fixed);

    if (fixed.trim() === text.trim()) {
      toast.style = Toast.Style.Success;
      toast.title = "Looks good — no changes needed";
      return;
    }

    await Clipboard.paste(fixed);
    toast.hide();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = formatError(err);
  }
}
