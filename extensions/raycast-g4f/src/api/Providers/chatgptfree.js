import { curlRequest } from "../curl.js";
import { format_chat_to_prompt } from "../../classes/message.js";
import { DEFAULT_HEADERS } from "../../helpers/headers.js";

const url = "https://chatgptfree.ai";
const api_url = "https://chatgptfree.ai/wp-admin/admin-ajax.php";

const headers = {
  ...DEFAULT_HEADERS,
  authority: "chatgptfree.ai",
  accept: "*/*",
  "accept-language": "en,fr-FR;q=0.9,fr;q=0.8,es-ES;q=0.7,es;q=0.6,en-US;q=0.5,am;q=0.4,de;q=0.3",
  origin: "https://chatgptfree.ai",
  referer: "https://chatgptfree.ai/chat/",
  "sec-ch-ua": '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "content-type": "application/x-www-form-urlencoded",
};

export const ChatgptFreeProvider = {
  name: "ChatGPTFree",
  customStream: true,
  generate: async function (chat, options, { stream_update }) {
    // get nonce
    let _nonce;
    let _response = "";
    await curlRequest(
      `${url}/`,
      {
        method: "GET",
        headers: headers,
      },
      (response) => {
        _response += response;
      }
    );

    let result = _response.match(/data-nonce="(.*?)"/);
    if (result) {
      _nonce = result[1];
    } else {
      throw new Error("No nonce found");
    }

    let prompt = format_chat_to_prompt(chat);

    let data = {
      _wpnonce: _nonce,
      post_id: null,
      url: url,
      action: "wpaicg_chat_shortcode_message",
      message: prompt,
      bot_id: "0",
      chatbot_identity: "shortcode",
    };

    const body = new URLSearchParams(data).toString();
    const request_url = `${api_url}?${body}`;

    let response = "";
    let buffer = "";
    let ended = false;

    await curlRequest(
      request_url,
      {
        method: "POST",
        headers: headers,
      },
      (chunk) => {
        if (ended) return;

        let lines = chunk.split("\n");
        for (let line of lines) {
          line = line.trim();
          if (line.startsWith("data: ")) {
            line = line.substring(6);
            if (line === "[DONE]") {
              ended = true;
              return;
            }
            try {
              let json = JSON.parse(line);
              let content = json["choices"][0]["delta"]?.content;
              if (content) {
                response += content;
                stream_update(response);
              }
            } catch {
              // ignore
            }
          } else if (line) {
            buffer += line;
          }
        }
      }
    );

    if (buffer) {
      try {
        let json = JSON.parse(buffer);
        if (json?.data) {
          response += json.data;
          stream_update(response);
        }
      } catch {
        // ignore
      }
    }
  },
};
