import OpenAIProvider from "../openai";
import { Prompt } from "../prompt";
import { TranslateQuery } from "../types";

export default class extends OpenAIProvider {
  private isChatAPI: boolean;
  constructor({ entrypoint, apikey }: { entrypoint: string; apikey: string }) {
    super({ apiModel: "", entrypoint, apikey });
    // Azure OpenAI Service supports multiple API.
    // We should check if the settings.apiURLPath is match `/deployments/{deployment-id}/chat/completions`.
    // If not, we should use the legacy parameters.
    console.log(entrypoint);
    console.log(apikey);
    this.isChatAPI = entrypoint.indexOf("/chat/completions") >= 0;
    console.log(this.isChatAPI);
  }

  headers(query: TranslateQuery, prompt: Prompt): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "api-key": this.apikey,
    };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  body(query: TranslateQuery, prompt: Prompt): Record<string, any> {
    const { rolePrompt, commandPrompt, contentPrompt } = prompt;
    const body: Record<string, any> = {
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
      stream: true,
    };

    if (!this.isChatAPI) {
      body[
        "prompt"
      ] = `<|im_start|>system\n${rolePrompt}\n<|im_end|>\n<|im_start|>user\n${commandPrompt}\n${contentPrompt}\n<|im_end|>\n<|im_start|>assistant\n`;
      body["stop"] = ["<|im_end|>"];
    }
    return body;
  }

  handleMessage(query: TranslateQuery, prompt: Prompt): (msg: string) => void {
    return (msg: string) => {
      const { quoteProcessor, meta } = prompt;
      const { isWordMode } = meta;
      let resp;
      try {
        resp = JSON.parse(msg);
        // eslint-disable-next-line no-empty
      } catch (error) {
        query.onFinish("stop");
        return;
      }

      const { choices } = resp;
      if (!choices || choices.length === 0) {
        return { error: "No result" };
      }
      const { finish_reason: finishReason } = choices[0];
      if (finishReason) {
        query.onFinish(finishReason);
        return;
      }

      let targetTxt = "";
      if (!this.isChatAPI) {
        // It's used for Azure OpenAI Service's legacy parameters.
        targetTxt = choices[0].text;
        if (quoteProcessor) {
          targetTxt = quoteProcessor.processText(targetTxt);
        }

        query.onMessage({ content: targetTxt, role: "", isWordMode });
      } else {
        const { content = "", role } = choices[0].delta;

        targetTxt = content;

        if (quoteProcessor) {
          targetTxt = quoteProcessor.processText(targetTxt);
        }

        query.onMessage({ content: targetTxt, role, isWordMode });
      }
    };
  }
}
