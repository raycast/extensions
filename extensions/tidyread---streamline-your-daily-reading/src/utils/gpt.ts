import fetch, { RequestInit } from "node-fetch";
import GPT3Tokenizer from "gpt3-tokenizer";
import { createParser } from "eventsource-parser";
import { RequestOptions } from "http";

export interface FetchSSEOptions extends RequestInit {
  onMessage(data: string): void;
}

export async function fetchSSE(url: string, options: FetchSSEOptions) {
  const { onMessage, signal: originSignal, ...fetchOptions } = options;
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

    const resp = await fetch(url, { ...fetchOptions, signal });

    clearTimeout(timerId);

    const parser = createParser((event) => {
      if (event.type === "event") {
        onMessage(event.data);
      }
    });

    if (resp.body) {
      for await (const chunk of resp.body) {
        if (chunk) {
          const str = new TextDecoder().decode(chunk as ArrayBuffer);
          parser.feed(str);
        }
      }
    }
  } catch (error) {
    if (abortByTimeout) {
      throw new Error("Connection Timeout");
    }

    throw error;
  }
}

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
export function estimateTokens(str: string): number {
  const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(str);
  return encoded.bpe.length;
}

type ChatGPTTemplate = {
  payload: {
    message: {
      role: "system" | "user" | "assistant";
      content: string;
      name?: string;
    };
    config?: {
      // 返回内容的token限制，限制消费
      maxTokens?: number;
      // 传输内容的最大token限制，包含contextMessages
      maxContentSize?: number;
      apiKey: string;
      modelName: string;
    };
  };
  response: {
    progress: string;
    done: string;
  };
};

const defaultConfig: Partial<ChatGPTTemplate["payload"]["config"]> = {
  maxContentSize: Infinity,
  // maxTokens: 2048,
  modelName: "gpt-3.5-turbo-16k",
};

export async function sendMessageToChatGPT(params: {
  apiHost?: string;
  agent?: RequestOptions["agent"];
  message: ChatGPTTemplate["payload"]["message"];
  contextMessages: ChatGPTTemplate["payload"]["message"][];
  config?: ChatGPTTemplate["payload"]["config"];
  onDone: (res: ChatGPTTemplate["response"]["done"]) => void;
  onFail: (error: Error) => void;
  onProgress?: (res: ChatGPTTemplate["response"]["progress"], cancel: () => void) => void;
}) {
  const { apiKey, modelName, maxContentSize, maxTokens } = { ...defaultConfig, ...params.config };
  const { agent, apiHost, onFail, onDone, onProgress } = params;
  let msgs = [...params.contextMessages, params.message];
  if (msgs.length === 0) {
    throw new Error("No messages to replay");
  }
  const head = msgs[0].role === "system" ? msgs[0] : undefined;
  if (head) {
    msgs = msgs.slice(1);
  }

  const maxTokensNumber = maxTokens;
  const maxLen = maxContentSize!;
  let totalLen = head ? estimateTokens(head.content) : 0;

  let prompts: ChatGPTTemplate["payload"]["message"][] = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    const msgTokenSize: number = estimateTokens(msg.content) + 200; // 200 作为预估的误差补偿
    if (msgTokenSize + totalLen > maxLen) {
      break;
    }
    prompts = [msg, ...prompts];
    totalLen += msgTokenSize;
  }
  if (head) {
    prompts = [head, ...prompts];
  }

  // fetch has been canceled
  let hasCancel = false;
  // abort signal for fetch
  const controller = new AbortController();
  const cancel = () => {
    hasCancel = true;
    controller.abort();
  };

  let fullText = "";
  const messages = prompts.map((msg) => ({ role: msg.role, content: msg.content }));
  const payload = {
    messages,
    model: modelName,
    max_tokens: maxTokensNumber,
    stream: true,
  };

  try {
    await fetchSSE(`${apiHost ? `${apiHost}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions"}`, {
      agent,
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      onMessage: (message) => {
        if (message === "[DONE]") {
          onDone(fullText);
          return;
        }
        const data = JSON.parse(message);
        if (data.error) {
          throw new Error(`Error from OpenAI: ${JSON.stringify(data)}`);
        }
        const text = data.choices[0]?.delta?.content;
        if (text !== undefined) {
          fullText += text;
          onProgress?.(fullText, cancel);
        }
      },
    });
  } catch (error) {
    // if a cancellation is performed
    // do not throw an exception
    // otherwise the content will be overwritten.
    if (hasCancel) {
      return;
    }
    onFail(error as any);
    throw error;
  }
}
