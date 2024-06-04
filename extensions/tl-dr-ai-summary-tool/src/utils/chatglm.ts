import { debugableAxios } from "./httpclient";
import { generateToken } from "./jwt";
import { AxiosResponse } from "axios/index";
import { ChatGlmOptions, ChatGlmResponse } from "../type";
import { ZHIPU } from "./keys";
import { Readable } from "stream";

// 使用配置忽略自签名证书错误的 axios 实例
const axiosInstance = debugableAxios();

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  opt: ChatGlmOptions = { useStream: false },
): Promise<string> {
  const url = opt.useStream ? ZHIPU.API_SSE_URL : ZHIPU.API_URL;

  return axiosInstance
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
        let buffer = "";  // Buffer to store partial JSON strings

        (response.data as Readable).on("data", (chunk: Buffer) => {
          const chunkStr = chunk.toString();
          buffer += chunkStr;

          let lines = buffer.split("\n");
          buffer = lines.pop() || "";  // Keep the last partial line in buffer

          lines.forEach((line: string) => {
            if (line.startsWith("data:")) {
              let data = line.replace(/^data:/, "").trim();
              if (data && data !== "[DONE]") {
                try {
                  let jsonData = JSON.parse(data);
                  if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                    output += jsonData.choices[0].delta.content;
                  }
                } catch (error) {
                  console.error("JSON parse error: ", error);
                }
              }
            }
          });

          let isFinish = chunkStr.includes("[DONE]");
          opt.streamListener && opt.streamListener(output, isFinish);
        });

        return new Promise((resolve) => {
          (response.data as Readable).on("end", () => resolve(output));
        });
      } else {
        return response.data.choices[0].message.content;
      }
    })
    .catch((error) => {
      console.error(error);
      return "";
    });
}