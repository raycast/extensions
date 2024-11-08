import fetch from "node-fetch";

const api_url = "https://api.airforce/chat/completions";

const headers = {
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  Authorization: "Bearer missing api key",
  Origin: "https://llmplayground.net",
  Referer: "https://llmplayground.net/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Content-Type": "application/json", // important as we are sending a JSON payload
};

export const RocksProvider = {
  name: "Rocks",
  generate: async function* (chat, options) {
    const payload = {
      messages: format_messages(chat),
      model: options.model,
      max_tokens: 100000,
      temperature: parseFloat(options.temperature) ?? 0.7,
      top_p: 0.9,
      stream: true,
    };

    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const reader = response.body;
    let last_chunk_time = Date.now();
    let first = true;

    const timeout = 4000;

    while (true) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), timeout);
      });

      try {
        const chunk = await Promise.race([
          new Promise((resolve) => {
            reader.once("readable", () => {
              try {
                const chunk = reader.read();
                resolve(chunk);
              } catch (e) {
                resolve("");
              }
            });
          }),
          timeoutPromise,
        ]);

        if (!first && Date.now() - last_chunk_time > timeout) {
          return;
        }

        if (chunk === null) {
          return;
        }

        const str = chunk.toString();
        let lines = str.split("\n");

        for (let line of lines) {
          if (line.startsWith("\n") || line.includes("discord.com/invite/") || line.includes("discord.gg/")) {
            continue;
          }

          if (line.startsWith("data: ")) {
            line = line.substring(6);
            try {
              line = JSON.parse(line);
              let content = line.choices[0].delta?.content;
              if (content) {
                yield content;
                last_chunk_time = Date.now();
                if (first) {
                  first = false;
                }
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        if (e.message === "Timeout") {
          if (!first) return; // Exit if a timeout occurs, i.e. response is complete
          else continue;
        }
        throw e;
      }
    }
  },
};

const flip_role = (role) => {
  return role === "user" ? "assistant" : "user";
};

const format_messages = (messages) => {
  const MESSAGE_MAX_CHARS = 1000 - 10;

  let formatted = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const role = message.role;
    let content = message.content;

    while (content.length > 0) {
      const chunk = content.substring(0, MESSAGE_MAX_CHARS);
      content = content.substring(MESSAGE_MAX_CHARS);
      formatted.push({ role: role, content: chunk });
      if (content.length === 0) {
        break;
      }
      formatted.push({ role: flip_role(role), content: "[system: continuing message]" });
    }
  }

  return formatted;
};
