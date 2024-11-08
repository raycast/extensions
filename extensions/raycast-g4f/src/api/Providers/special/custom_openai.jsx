import { getCustomAPIInfo } from "./g4f_local";

import { messages_to_json } from "../../../classes/message.js";
import fetch from "node-fetch";

const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4";
const DEFAULT_CONFIG = JSON.stringify({ model: DEFAULT_MODEL });
const DEFAULT_INFO = JSON.stringify({ api_url: DEFAULT_API_URL, api_key: "", config: DEFAULT_CONFIG });

export const getCustomOpenAiInfo = async (apiInfo) => {
  return JSON.parse(apiInfo.openai_info || DEFAULT_INFO);
};

export const CustomOpenAIProvider = {
  name: "CustomOpenAI",
  generate: async function* (chat) {
    const apiInfo = await getCustomOpenAiInfo(await getCustomAPIInfo());
    const api_url = apiInfo.api_url;
    const api_key = apiInfo.api_key;
    const config = apiInfo.config;

    let headers = {
      "Content-Type": "application/json",
      Authorization: api_key ? `Bearer ${api_key}` : undefined,
    };

    chat = messages_to_json(chat);
    let body = {
      messages: chat,
      stream: true,
      ...config,
    };

    let response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    const reader = response.body;

    for await (let chunk of reader) {
      const str = chunk.toString();
      let lines = str.split("\n");

      for (let line of lines) {
        // Although this is not technically OpenAI compatible, we handle the
        // APIs that return chunks starting with "data: " as well.
        if (line.startsWith("data: ")) {
          line = line.substring(6);
        }
        if (!line) continue;
        if (line.slice(0, 6) === "[DONE]") return;

        try {
          let json = JSON.parse(line);
          let chunk = json["choices"][0]["delta"] ?? json["choices"][0]["message"];
          chunk = chunk["content"];
          yield chunk;
        } catch (e) {
          console.log(e);
        }
      }
    }
  },
};
