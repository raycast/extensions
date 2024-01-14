import axios from "axios";
import https from "https";
import { generateToken } from "./jwt";
import { AxiosResponse } from "axios/index";
import { ChatGlmOptions, ChatGlmResponse } from "../type";
import { ZHIPU } from "./keys";
import { environment } from "@raycast/api";

const ignoreSSL = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: environment.isDevelopment ? false : true,
  }),
});
const proxy = environment.isDevelopment ? {
  host: "127.0.0.1",
  port: 9090,
}: undefined;

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  opt: ChatGlmOptions = { useStream: false },
): Promise<string> {
  return ignoreSSL
    .post(
      opt.useStream ? ZHIPU.API_SSE_URL : ZHIPU.API_URL,
      {
        prompt: messages,
        return_type: "text",
      },
      {
        headers: {
          Authorization: `${generateToken()}`,
        },
        proxy: proxy,
        responseType: opt.useStream ? "stream" : "json",
      },
    )
    .then((response: AxiosResponse<ChatGlmResponse>) => {
      if (opt.useStream) {
        let output = "";
        (response.data as any).on("data", (chunk: any) => {
          chunk = chunk.toString();
          chunk.split("\n").forEach((line: string) => {
            if (line.startsWith("data:")) {
              let data = line.replace(/^data:/, "")
              if (data == ""){
                data = "\n"
              }
              output += data;
            }
          })
          let isFinish = false;
          if (chunk.startsWith('event:finish')) {
            isFinish = true;
          }
          // console.info(chunk.toString());
          if (isFinish) {
            // end
            // console.info(output)
          }
          opt.streamListener && opt.streamListener(output, isFinish)
        });
        return "流式输出中";
      } else {
        return response.data.data.choices[0].content;
      }
    });
}
