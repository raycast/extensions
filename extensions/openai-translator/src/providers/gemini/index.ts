/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Provider, Message } from "../base";
import { Prompt } from "../prompt";
import { TranslateQuery, ProviderProps } from "../types";
import { fetchSSE } from "../utils";
/* @ts-expect-error: has no exported member 'compose' */
import { compose } from "stream";

import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";

const API = "streamGenerateContent";
export default class extends Provider {
  protected props: ProviderProps;
  protected apikey: string;
  constructor(props: ProviderProps) {
    super(props);
    this.props = props;
    this.apikey = props.apikey!;
  }

  protected async *doTranslate(query: TranslateQuery, prompt: Prompt): AsyncGenerator<Message> {
    const body = this.body(query, prompt);
    const messages = this.messages(query, prompt);
    const headers = this.headers(query, prompt);

    const isFirst = true;

    body["contents"] = messages;
    const { quoteProcessor, meta } = prompt;
    const { isWordMode } = meta;
    const options = {
      ...this.options(query, prompt),
      body: JSON.stringify(body),
      headers,
    };
    const source = fetchSSE(`${this.props.entrypoint}/${this.props.apiModel}:${API}?key=${this.apikey}`, options);

    yield* compose(
      source,
      parser({ packStrings: false, packKeys: true }),
      pick({ filter: /(candidates)|(promptFeedback)/i }),
      async function* (source: Iterable<{ name: string; value: any }>) {
        let textMode = false;
        for await (const { name, value } of source) {
          if (textMode) {
            switch (name) {
              case "stringChunk":
                yield value;
                break;
              case "endString":
                textMode = false;
                break;
            }
          } else if (name == "keyValue") {
            switch (value) {
              case "blockReasonMessage":
                throw new Error(value.blockReasonMessage);
              case "text":
                textMode = true;
                break;
            }
          }
        }
      },
      async function* (source: Iterable<string>) {
        for await (const chunk of source) {
          console.log(chunk);
          if (chunk) {
            let targetTxt = "";
            const content = chunk;
            const role = null; //msg[0].content.role;
            targetTxt = content ? content : "";
            if (quoteProcessor) {
              targetTxt = quoteProcessor.processText(targetTxt);
            }
            yield { content: targetTxt, role, isWordMode };
          }
        }
      },
    );

    yield "stop";
  }

  headers(query: TranslateQuery, prompt: Prompt): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    return headers;
  }

  body(query: TranslateQuery, prompt: Prompt): Record<string, any> {
    const { quoteProcessor, meta } = prompt;
    const { isWordMode } = meta;
    return {
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
      ],
      generationConfig: {
        stopSequences: quoteProcessor ? [quoteProcessor.quoteEnd] : [],
        temperature: isWordMode ? 0.7 : 0,
        maxOutputTokens: 1000,
        topP: 1,
      },
    };
  }

  messages(query: TranslateQuery, prompt: Prompt): any {
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt } = prompt;

    return [
      {
        parts: [
          { text: rolePrompt },
          ...assistantPrompts.map((prompt) => {
            return { text: prompt };
          }),
          { text: commandPrompt },
          { text: contentPrompt },
        ],
      },
    ];
  }

  options(query: TranslateQuery, prompt: Prompt) {
    return {
      method: "POST",
      signal: query.signal,
      agent: query.agent,
    };
  }
}
