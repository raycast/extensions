export const EcosiaProvider = "EcosiaProvider";
import fetch from "node-fetch";
import { messages_to_json } from "../../../classes/message.js";

const api_url = "https://api.ecosia.org/v2/chat/?sp=productivity";
const headers = {
  authority: "api.ecosia.org",
  accept: "*/*",
  "content-type": "application/json",
  origin: "https://www.ecosia.org",
  referer: "https://www.ecosia.org/",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0.3 Mobile/15E148 Safari/604.1 RDDocuments/8.7.2.978",
};

export const getEcosiaResponse = async function* (chat, options, max_retries = 5) {
  // python: "messages": base64.b64encode(json.dumps(chat).encode()).decode()
  chat = messages_to_json(chat);
  let chatJson = JSON.stringify(chat);
  let encodedChat = Buffer.from(chatJson).toString("base64").toString();
  let data = {
    messages: encodedChat,
  };

  try {
    // POST
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });
    const reader = response.body;

    for await (let chunk of reader) {
      chunk = chunk.toString();
      if (chunk) yield chunk;
    }
  } catch (e) {
    if (max_retries > 0) {
      console.log(e, "Retrying...");
      yield* getEcosiaResponse(chat, options, max_retries - 1);
    } else {
      throw e;
    }
  }
};
