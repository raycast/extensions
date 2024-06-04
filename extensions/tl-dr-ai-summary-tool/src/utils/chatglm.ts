import { debugableAxios } from "./httpclient";
import { generateToken } from "./jwt";
import { AxiosResponse } from "axios/index";
import { ChatGlmOptions, ChatGlmResponse } from "../type";
import { ZHIPU } from "./keys";
import { Readable } from "stream";

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  opt: ChatGlmOptions = { useStream: false },
): Promise<string> {
  const url = opt.useStream ? ZHIPU.API_SSE_URL : ZHIPU.API_URL;

  return debugableAxios()
    .post(
      url,
      {
        model: "glm-4",
        messages: messages,
        stream: opt.useStream,
      },
      {
        headers: {
          Authorization: `Bearer ${generateToken()}`,
          'Content-Type': 'application/json'
        },
        responseType: opt.useStream ? "stream" : "json",
      },
    )
    .then((response: AxiosResponse<ChatGlmResponse>) => {
      if (opt.useStream) {
        let output = "";
        (response.data as Readable).on("data", (chunk: string) => {
          chunk = chunk.toString();
          chunk.split("\n").forEach((line: string) => {
            if (line.startsWith("data:")) {
              let data = line.replace(/^data:/, "").trim();
              if (data && data !== "[DONE]") {
                let jsonData = JSON.parse(data);
                if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                  output += jsonData.choices[0].delta.content;
                }
              }
            }
          });
          let isFinish = chunk.includes("[DONE]");
          opt.streamListener && opt.streamListener(output, isFinish);
        });
        return "Loading...";
      } else {
        return response.data.choices[0].message.content;
      }
    })
    .catch((error) => {
      console.error(error);
      return "";
    });
}