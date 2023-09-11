/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Provider } from "../base";
import { Prompt } from "../prompt";
import { TranslateQuery } from "../types";
import { fetchSSE, getErrorText } from "../utils";

export default class extends Provider {
  protected model: string;
  protected entrypoint: string;
  protected apikey: string; //

  constructor({ apiModel, entrypoint, apikey }: { apiModel: string; entrypoint: string; apikey: string }) {
    super();
    this.model = apiModel;
    this.entrypoint = entrypoint;
    this.apikey = apikey;
  }

  async doTranslate(query: TranslateQuery, prompt: Prompt): Promise<void> {
    const body = this.body(query, prompt);
    const messages = this.messages(query, prompt);
    const headers = this.headers(query, prompt);
    const onMessage = this.handleMessage(query, prompt);

    const isFirst = true;

    body["messages"] = messages;

    const options = {
      ...this.options(query, prompt),
      body: JSON.stringify(body),
      headers,
      onMessage,
    };
    await fetchSSE(`${this.entrypoint}`, options);
  }

  headers(query: TranslateQuery, prompt: Prompt): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apikey != "none") {
      headers["Authorization"] = `Bearer ${this.apikey}`;
    }
    return headers;
  }

  body(query: TranslateQuery, prompt: Prompt): Record<string, any> {
    return {
      model: this.model,
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
      stream: true,
    };
  }

  messages(query: TranslateQuery, prompt: Prompt): any {
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt } = prompt;

    return [
      {
        role: "system",
        content: rolePrompt,
      },
      ...assistantPrompts.map((prompt) => {
        return {
          role: "user",
          content: prompt,
        };
      }),
      {
        role: "user",
        content: commandPrompt,
      },
      {
        role: "user",
        content: contentPrompt,
      },
    ];
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
      const { content = "", role } = choices[0].delta;

      targetTxt = content;

      if (quoteProcessor) {
        targetTxt = quoteProcessor.processText(targetTxt);
      }
      query.onMessage({ content: targetTxt, role, isWordMode });
    };
  }

  options(query: TranslateQuery, prompt: Prompt) {
    return {
      method: "POST",
      signal: query.signal,
      agent: query.agent,
      onError: (err: any) => {
        query.onError(getErrorText(err));
      },
    };
  }
}
