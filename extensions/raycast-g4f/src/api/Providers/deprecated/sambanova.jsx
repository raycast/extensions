import fetch from "node-fetch";
import { messages_to_json } from "../../../classes/message.js";

const api_url = "https://cloud.sambanova.ai/api/completion";

const headers = {
  "Content-Type": "application/json",
  Accept: "text/event-stream",
  Host: "cloud.sambanova.ai",
  Origin: "https://cloud.sambanova.ai",
  Referer: "https://cloud.sambanova.ai/",
  Cookie: "access_token=<YOUR_ACCESS_TOKEN>",
};

const env_types = {
  "Meta-Llama-3.1-405B-Instruct": "tp16405b",
  "Meta-Llama-3.1-70B-Instruct": "tp1670b",
  "Meta-Llama-3.1-8B-Instruct": "tp16",
};

export const SambaNovaProvider = {
  name: "SambaNova",
  generate: async function* (chat, options, { max_retries = 3 }) {
    chat = messages_to_json(chat);

    let payload = {
      body: {
        model: options.model,
        messages: chat,
        stream: options.stream,
        stop: ["<|eot_id|>"],
      },
      env_type: env_types[options.model] || "tp16",
    };

    try {
      const response = await fetch(api_url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      const reader = response.body;
      for await (let chunk of reader) {
        const str = chunk.toString();
        let lines = str.split("\n");
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          if (line.startsWith("data: ")) {
            let chunk = line.substring(6);
            if (chunk.trim() === "[DONE]") return;

            try {
              let data = JSON.parse(chunk);
              let delta = data["choices"][0]["delta"]["content"];
              if (delta) {
                yield delta;
              }
            } catch (e) {} // eslint-disable-line
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
