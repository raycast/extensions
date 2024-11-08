import fetch from "node-fetch";
import { format_chat_to_prompt } from "../../classes/message.js";

const url = "https://www.pizzagpt.it";
const api_url = "https://www.pizzagpt.it/api/chatx-completion";

const headers = {
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  Origin: url,
  Referer: `${url}/en`,
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "X-Secret": "Marinara",
};

export const PizzaGPTProvider = {
  name: "PizzaGPT",
  generate: async function (chat) {
    const payload = {
      question: format_chat_to_prompt(chat),
    };
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    return json.answer.content;
  },
};
