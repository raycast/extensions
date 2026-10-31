/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LocalStorage } from "@raycast/api";
import { Provider, Message } from "../base";
import { Prompt } from "../prompt";
import { TranslateQuery, ProviderProps } from "../types";
import { fetchSSE, SSETransform } from "../utils";
import { canDrop, parseRejected, rejectedParam, withoutRejected } from "./rejected-params";
/* @ts-expect-error: has no exported member 'compose' */
import { compose } from "stream";

export default class extends Provider {
  protected model: string | undefined;
  protected entrypoint: string;
  protected apikey: string | undefined; //

  constructor(props: ProviderProps) {
    super(props);
    this.model = props.apiModel;
    this.entrypoint = props.entrypoint;
    this.apikey = props.apikey;
  }

  protected async *doTranslate(query: TranslateQuery, prompt: Prompt): AsyncGenerator<Message> {
    const fullBody = this.body(query, prompt);
    const messages = this.messages(query, prompt);
    const headers = this.headers(query, prompt);

    const messageParser = this.handleMessage(prompt);

    fullBody["messages"] = messages;

    // Parameters this model rejected before, see rejected-params.ts.
    const storageKey = `rejected-params:${this.entrypoint}:${this.model ?? ""}`;
    const rejected = parseRejected(await LocalStorage.getItem<string>(storageKey));

    for (;;) {
      const body = withoutRejected(fullBody, rejected);
      const options = {
        ...this.options(query, prompt),
        body: JSON.stringify(body),
        headers,
      };
      const source = fetchSSE(`${this.entrypoint}`, options);

      // fetchSSE throws the API error before the first chunk, so a retry never cuts into a stream.
      let first: IteratorResult<any>;
      try {
        first = await source.next();
      } catch (error) {
        const param = rejectedParam(error);
        if (param === undefined || !canDrop(body, param)) throw error;
        rejected.push(param);
        await LocalStorage.setItem(storageKey, JSON.stringify(rejected));
        continue;
      }

      yield* compose(prepend(first, source), new SSETransform(), messageParser);
      return;
    }
  }

  headers(query: TranslateQuery, prompt: Prompt): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apikey && this.apikey != "none") {
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

  handleMessage(prompt: Prompt): (source: any) => AsyncGenerator<Message> {
    return async function* (source) {
      for await (const chunk of source) {
        // console.debug(chunk)
        if (chunk) {
          const { quoteProcessor, meta } = prompt;
          const { isWordMode } = meta;
          let resp;
          try {
            // console.debug("=====parse=====");
            // console.debug(chunk.data);
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
                const { content = "", role } = choices[0].delta;

                targetTxt = content ? content : "";

                if (quoteProcessor) {
                  targetTxt = quoteProcessor.processText(targetTxt);
                }
                yield { content: targetTxt, role, isWordMode };
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

  options(query: TranslateQuery, prompt: Prompt) {
    return {
      method: "POST",
      signal: query.signal,
      agent: query.agent,
    };
  }
}

// Puts back the chunk read to check for an API error.
async function* prepend<T>(first: IteratorResult<T>, rest: AsyncGenerator<T>): AsyncGenerator<T> {
  try {
    if (first.done) return;
    yield first.value;
    yield* rest;
  } finally {
    // Closes the response stream when the consumer stops early.
    await rest.return(undefined);
  }
}
