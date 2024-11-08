import fetch from "node-fetch";
import { format_chat_to_prompt } from "../../classes/message.js";
import { sleep } from "../../helpers/helper.js";

const status_url = "https://duckduckgo.com/duckchat/v1/status";
const chat_url = "https://duckduckgo.com/duckchat/v1/chat";
const referer = "https://duckduckgo.com/";
const origin = "https://duckduckgo.com";

const user_agent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const headers = {
  "User-Agent": user_agent,
  Accept: "text/event-stream",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: referer,
  "Content-Type": "application/json",
  Origin: origin,
  Connection: "keep-alive",
  Cookie: "dcm=3; s=l; bf=1",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Pragma: "no-cache",
  TE: "trailers",
};

const get_vqd = async () => {
  const _headers = { ...headers, "x-vqd-accept": "1" };
  const response = await fetch(status_url, { headers: _headers });

  return response.headers.get("x-vqd-4");
};

export const DuckDuckGoProvider = {
  name: "DuckDuckGo",
  generate: async function* (chat, options, { max_retries = 3 }) {
    try {
      let vqd_4;
      for (let _ = 0; _ < 3; _++) {
        try {
          vqd_4 = await get_vqd();
          break;
        } catch (e) {
          // sleep for a while before retrying
          await sleep(1000);
        }
      }

      if (!vqd_4) {
        throw new Error("Failed to get vqd");
      }

      // I really don't know how the vqd_4 storage thing works,
      // so we just format the chat as a single message instead
      let payload = {
        model: options.model,
        messages: [
          {
            role: "user",
            content: format_chat_to_prompt(chat),
          },
        ],
      };

      let _headers = {
        ...headers,
        "x-vqd-4": vqd_4,
      };

      const response = await fetch(chat_url, {
        method: "POST",
        headers: _headers,
        body: JSON.stringify(payload),
      });

      const reader = response.body;
      for await (let chunk of reader) {
        const str = chunk.toString();
        let lines = str.split("\n");
        for (let line of lines) {
          if (line.startsWith("data: ")) {
            let chunk = line.substring(6);
            if (chunk.trim() === "[DONE]") return;

            try {
              let data = JSON.parse(chunk);
              let delta = data["message"];
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
