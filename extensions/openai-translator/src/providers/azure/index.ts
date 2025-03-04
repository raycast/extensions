import OpenAIProvider from "../openai";
import { Message } from "../base";
import { Prompt } from "../prompt";
import { TranslateQuery, ProviderProps } from "../types";

export default class extends OpenAIProvider {
  private isChatAPI: boolean;
  constructor(props: ProviderProps) {
    super(props);
    // Azure OpenAI Service supports multiple API.
    // We should check if the settings.apiURLPath is match `/deployments/{deployment-id}/chat/completions`.
    // If not, we should use the legacy parameters.
    console.log(props.entrypoint);
    console.log(props.apikey);
    this.isChatAPI = props.entrypoint.indexOf("/chat/completions") >= 0;
    console.log(this.isChatAPI);
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  headers(query: TranslateQuery, prompt: Prompt): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "api-key": this.apikey!,
    };
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
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
      body["prompt"] =
        `<|im_start|>system\n${rolePrompt}\n<|im_end|>\n<|im_start|>user\n${commandPrompt}\n${contentPrompt}\n<|im_end|>\n<|im_start|>assistant\n`;
      body["stop"] = ["<|im_end|>"];
    }
    return body;
  }

  handleMessage(prompt: Prompt): (source: any) => AsyncGenerator<Message> {
    const isChatAPI = this.isChatAPI;
    return async function* (source) {
      for await (const chunk of source) {
        if (chunk) {
          const { quoteProcessor, meta } = prompt;
          const { isWordMode } = meta;
          let resp;
          try {
            console.debug("=====parse=====");
            console.debug(chunk.data);
            resp = JSON.parse(chunk.data);
            const { choices } = resp;
            if (!choices || choices.length === 0) {
              console.debug({ error: "No result" });
            } else {
              const { finish_reason: finishReason } = choices[0];
              if (finishReason) {
                yield finishReason;
              } else {
                let targetTxt = "";
                if (!isChatAPI) {
                  // It's used for Azure OpenAI Service's legacy parameters.
                  targetTxt = choices[0].text;
                  if (quoteProcessor) {
                    targetTxt = quoteProcessor.processText(targetTxt);
                  }

                  yield { content: targetTxt, role: "", isWordMode };
                } else {
                  const { content = "", role } = choices[0].delta;
                  targetTxt = content;
                  if (quoteProcessor) {
                    targetTxt = quoteProcessor.processText(targetTxt);
                  }
                  yield { content: targetTxt, role, isWordMode };
                }
              }
            }
          } catch (error) {
            console.debug({ error: "Parse error" });
            yield "stop";
          }
        } else {
          // TODO: find out why chunk is null
          console.debug("chunk is null");
        }
      }
    };
  }
}
