import fetch from "node-fetch";
import fs from "fs";

import { messages_to_json } from "../../classes/message.js";
import { Preferences } from "../preferences.js";

// Implementation ported from gpt4free DeepInfra provider.

const api_url = "https://api.deepinfra.com/v1/openai/chat/completions";
const headers = {
  Accept: "text/event-stream",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US",
  "Content-Type": "application/json",
  Connection: "keep-alive",
  Origin: "https://deepinfra.com",
  Referer: "https://deepinfra.com/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "X-Deepinfra-Source": "web-embed",
  "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

// Models that support function calling
const function_supported_models = [
  "mistralai/Mixtral-8x22B-Instruct-v0.1",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "Qwen/Qwen2.5-72B-Instruct",
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "meta-llama/Meta-Llama-3-70B-Instruct",
  "meta-llama/Meta-Llama-3.1-405B-Instruct",
  "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "nvidia/Llama-3.1-Nemotron-70B-Instruct",
];

// Models that support file uploads
const file_supported_models = ["meta-llama/Llama-3.2-90B-Vision-Instruct", "meta-llama/Llama-3.2-11B-Vision-Instruct"];

// max_tokens parameter overrides - some models have short context lengths
const max_tokens_overrides = {
  "google/gemma-2-27b-it": 512,
};

const DeepInfraFormatChat = (chat, model) => {
  if (!file_supported_models.includes(model)) {
    return messages_to_json(chat);
  } else {
    let formattedChat = [];
    for (let i = 0; i < chat.length; i++) {
      const message = chat[i];
      let msg = {
        role: message.role,
        content: [],
      };

      if (message.files && message.files.length > 0) {
        for (const file of message.files) {
          let base64 = fs.readFileSync(file, { encoding: "base64" });
          let ext = file.split(".").pop();
          base64 = `data:image/${ext};base64,${base64}`;
          msg.content.push({
            type: "image_url",
            image_url: {
              url: base64,
            },
          });
        }
        msg.content.push({
          type: "text",
          text: message.content,
        });
      } else {
        msg.content = message.content;
      }

      formattedChat.push(msg);
    }
    return formattedChat;
  }
};

export const DeepInfraProvider = {
  name: "DeepInfra",
  generate: async function* (chat, options, { max_retries = 5 }) {
    const model = options.model;
    const json_chat = DeepInfraFormatChat(chat, model);

    const useWebSearch = options.webSearch === "auto" && function_supported_models.includes(model);
    const useCodeInterpreter = Preferences["codeInterpreter"] && function_supported_models.includes(model);

    // Dynamically import tools if needed
    let getWebResult, webSearchTool, codeInterpreterTool, getCodeInterpreterResult;
    if (useWebSearch) {
      ({ getWebResult, webSearchTool } = await import("../tools/web.jsx"));
    }
    if (useCodeInterpreter) {
      ({ getCodeInterpreterResult, codeInterpreterTool } = await import("../tools/code.jsx"));
    }
    const tools = [...(useWebSearch ? [webSearchTool] : []), ...(useCodeInterpreter ? [codeInterpreterTool] : [])];

    let data = {
      model: model,
      messages: json_chat,
      tools: tools.length > 0 ? tools : undefined,
      temperature: options.temperature,
      max_tokens: max_tokens_overrides[model] || 100000,
      stream: true,
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

      // Implementation taken from gpt4free: g4f/Provider/needs_auth/Openai.py at async def create_async_generator()
      let first = true;

      const reader = response.body;
      for await (let chunk of reader) {
        const str = chunk.toString();
        let lines = str.split("\n");

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          if (line.startsWith("data: ")) {
            let chunk = line.substring(6);
            if (chunk.trim() === "[DONE]") return; // trim() is important

            try {
              let data = JSON.parse(chunk);
              let delta = data["choices"][0]["delta"];

              // Function calling
              let tool_calls = delta["tool_calls"];
              if (tool_calls && tool_calls.length > 0) {
                let call_name = tool_calls[0]["function"]["name"];
                let call_args = JSON.parse(tool_calls[0]["function"]["arguments"]);
                try {
                  call_args = JSON.parse(call_args.toString());
                } catch (e) {} // eslint-disable-line
                let call_id = tool_calls[0]["id"];

                console.log("Function call:", call_name, call_args);

                if (call_name === "web_search") {
                  let web_search_query = call_args["query"];

                  let webResponse = await getWebResult(web_search_query);
                  let msg = {
                    role: "tool",
                    content: webResponse,
                    tool_call_id: call_id,
                  };
                  chat.push(msg);

                  // Notice how the message is only temporarily added to the chat object,
                  // and thus the web search results are not saved in the chat object.
                  // This is due to difficulty of implementation in the current code base.
                  // TODO: rewrite codebase so this is possible!

                  // generate a new request
                  yield* this.generate(chat, options, { max_retries });
                  return;
                } else if (call_name === "run_code") {
                  let code = call_args["code"];
                  let codeResponse = await getCodeInterpreterResult(code);
                  let msg = {
                    role: "tool",
                    content: codeResponse,
                    tool_call_id: call_id,
                  };
                  chat.push(msg);
                  yield* this.generate(chat, options, { max_retries });
                  return;
                }
              }

              let content = delta["content"];
              if (content) {
                if (first) {
                  content = content.trimStart();
                  first = false;
                }
                yield content;
              }
            } catch (e) {
              console.log(e);
            }
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
