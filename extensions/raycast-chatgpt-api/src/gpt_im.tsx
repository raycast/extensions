import { Detail } from "@raycast/api";
import { useState } from "react";
import { invokeChatGPT, saveHistory } from "./lib/utils";

/**
 * 入口文件
 * @param args
 * @returns
 */
export default function Command(args: any) {
  // 初始化设置
  const [isLoading, setIsLoading] = useState(true);
  const [gptResut, setGptResult] = useState("");
  const { content } = args.arguments;

  if (isLoading) {
    const msg = [
      { role: "system", content: "你将作为我的信息收集助理，解答我提的问题。" },
      { role: "user", content: `${content}` },
    ];
    const GPT = invokeChatGPT(msg);
    setIsLoading &&
      GPT.then((res) => {
        const data = res.data;
        saveHistory("im", content, data);
        setGptResult(`${data.choices[0].message.content}`);
      })
        .catch((err) => {
          setGptResult(`error: ${err.message}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
  }

  return <Detail isLoading={isLoading} markdown={gptResut} />;
}
