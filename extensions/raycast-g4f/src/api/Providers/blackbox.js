import fetch from "node-fetch";
import { format_chat_to_prompt } from "../../classes/message.js";
import { randomBytes, randomUUID } from "crypto";

// Implementation ported from gpt4free Blackbox provider.

const api_url = "https://www.blackbox.ai/api/chat";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.blackbox.ai",
  "Content-Type": "application/json",
  Origin: "https://www.blackbox.ai",
  DNT: "1",
  "Sec-GPC": "1",
  "Alt-Used": "www.blackbox.ai",
  Connection: "keep-alive",
};

const token_hex = function (nbytes) {
  // python: binascii.hexlify(token_bytes(nbytes)).decode('ascii')
  return randomBytes(nbytes).toString("hex");
};

const uuid4 = function () {
  // python: str(uuid.uuid4())
  return randomUUID();
};

const trendingAgentModeConfig = {
  blackbox: {},
  "llama-3.1-405b": { mode: true, id: "llama-3.1-405b" },
  "llama-3.1-70b": { mode: true, id: "llama-3.1-70b" },
  "gemini-1.5-flash": { mode: true, id: "Gemini" },
};

const userSelectedModelConfig = {
  "gpt-4o": "gpt-4o",
  "claude-3.5-sonnet": "claude-sonnet-3.5",
  "gemini-pro": "gemini-pro",
};

const paramOverrides = {
  "gpt-4o": {
    maxTokens: 4096,
    // playgroundTemperature: null,
    // playgroundTopP: null,
  },
  "claude-3.5-sonnet": {
    maxTokens: 8192,
  },
  "gemini-pro": {
    maxTokens: 8192,
  },
};

export const BlackboxProvider = {
  name: "Blackbox",
  generate: async function* (chat, options, { max_retries = 5 }) {
    let random_id = token_hex(16);
    let random_user_id = uuid4();

    // The chat is truncated to ~4 messages by the provider, so we reformat it
    // to at most 3 messages, with the last message being the prompt.
    let prompt = chat.pop().content; // remove last message
    if (chat.length > 0) {
      console.assert(chat.length > 1);
      console.assert(chat[chat.length - 1].role === "assistant");
      const last_assistant_message = chat.pop().content; // remove last assistant message
      chat = [
        { role: "user", content: format_chat_to_prompt(chat, { assistant: false }) },
        { role: "assistant", content: last_assistant_message },
      ];
    }
    chat.push({ role: "user", content: prompt });

    let data = {
      messages: chat,
      id: random_id,
      userId: random_user_id,
      previewToken: null,
      codeModelMode: true,
      agentMode: {},
      trendingAgentMode: trendingAgentModeConfig[options.model] || {},
      userSelectedModel: userSelectedModelConfig[options.model] || undefined,
      isMicMode: false,
      isChromeExt: false,
      githubToken: null,
      webSearchMode: true,
      userSystemPrompt: null,
      mobileClient: false,
      maxTokens: 100000,
      playgroundTemperature: parseFloat(options.temperature) ?? 0.7,
      playgroundTopP: 0.9,
      ...paramOverrides[options.model],
    };

    try {
      // POST
      const response = await fetch(api_url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`status: ${response.status}, error: ${await response.text()}`);
      }

      const reader = response.body;
      let search_results = false;
      let text = "";
      for await (let chunk of reader) {
        chunk = chunk.toString();

        if (chunk) {
          if (!search_results && chunk.includes("$~~~$")) {
            search_results = true;
          }
          text += chunk;
          yield chunk;
        }
      }

      // Update 29/8/24: if search results are present, the response is only generated
      // a little bit. then we need to add "mode": "continue" to the data and send another
      // request to get the rest of the response.
      if (search_results) {
        data.mode = "continue";
        data.messages.push({ content: text, role: "assistant" });

        yield " ";

        const response = await fetch(api_url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        });

        const reader = response.body;
        for await (let chunk of reader) {
          chunk = chunk.toString();
          if (chunk) {
            yield chunk;
          }
        }
      }
    } catch (e) {
      if (max_retries > 0) {
        console.log(e, "Retrying...");
        yield* this.generate(chat, options, { max_retries: max_retries - 1 });
      } else {
        throw e;
      }
    }
  },
};
