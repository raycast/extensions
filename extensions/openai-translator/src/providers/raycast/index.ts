import { AI, environment } from "@raycast/api";
import { ProviderProps } from "../types";
import { Provider, Message } from "../base";
import { Prompt } from "../prompt";
import { TranslateQuery } from "../types";

const MODEL_NAME = "gpt-3.5-turbo";

export default class extends Provider {
  constructor(_: ProviderProps) {
    super(_);
  }

  protected async *doTranslate(query: TranslateQuery, prompt: Prompt): AsyncGenerator<Message> {
    const { signal: originSignal } = query;
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt, quoteProcessor, meta } = prompt;
    const { isWordMode } = meta;

    const timeout = 15 * 1000;
    const ctrl = new AbortController();
    try {
      const { signal } = ctrl;
      if (originSignal) {
        originSignal.addEventListener("abort", () => ctrl.abort());
      }
      const timerId = setTimeout(() => {
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
      yield { content: targetTxt, role: "", isWordMode };
      yield "stop";
    } catch (error) {
      console.debug(error);
      if (ctrl.signal.aborted) {
        throw new Error("Connection Timeout");
      } else {
        throw error;
      }
    }
  }
}
