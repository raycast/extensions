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
  return debugableAxios()
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
              let data = line.replace(/^data:/, "");
              if (data.trim() == "") {
                data = "\n";
              }
              output += data;
            }
          });
          let isFinish = false;
          if (chunk.startsWith("event:finish")) {
            isFinish = true;
          }
          // console.info(chunk.toString());
          if (isFinish) {
            // end
            // console.info(output)
          }
          opt.streamListener && opt.streamListener(output, isFinish);
        });
        return "Loading...";
      } else {
        return response.data.data.choices[0].content;
      }
    })
    .catch((error) => {
      console.error(error);
      return "";
    });
}
