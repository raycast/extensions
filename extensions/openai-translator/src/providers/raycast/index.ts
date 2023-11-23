import { AI, environment } from "@raycast/api";
import { Provider } from "../base";
import { Prompt } from "../prompt";
import { TranslateQuery } from "../types";
import { getErrorText } from "../utils";

const MODEL_NAME = "gpt-3.5-turbo";

export default class extends Provider {
  async doTranslate(query: TranslateQuery, prompt: Prompt): Promise<void> {
    const { onMessage, onFinish, onError, signal: originSignal } = query;
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt, quoteProcessor, meta } = prompt;
    const { isWordMode } = meta;

    const timeout = 15 * 1000;
    let abortByTimeout = false;

    try {
      const ctrl = new AbortController();
      const { signal } = ctrl;
      if (originSignal) {
        originSignal.addEventListener("abort", () => ctrl.abort());
      }
      const timerId = setTimeout(() => {
        abortByTimeout = true;
        ctrl.abort();
      }, timeout);

      if (!environment.canAccess(AI)) {
        throw new Error("You do not have access to RaycastAI.");
      }

      const prompt = `${rolePrompt}\n${assistantPrompts.map((p) => p).join("\n")}${
        commandPrompt ?? ""
      }\n${contentPrompt}\n`;

      const resp = await AI.ask(prompt, {
        model: MODEL_NAME,
        creativity: "low",
        signal,
      });

      clearTimeout(timerId);
      let targetTxt = resp ? resp.replaceAll("\n", "\n\n") : "";
      if (quoteProcessor) {
        targetTxt = quoteProcessor.processText(targetTxt);
      }
      onMessage({ content: targetTxt, role: "", isWordMode });
      onFinish("stop");
    } catch (error) {
      if (abortByTimeout) {
        onError("Connection Timeout");
      } else {
        onError(getErrorText(error));
      }
    }
  }
}
