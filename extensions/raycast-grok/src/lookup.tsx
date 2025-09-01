import { getSelectedText, LaunchProps, showToast, Toast, Clipboard } from "@raycast/api";
import DetailUI from "./ui/DetailUI";
import { useGrok } from "./hooks/useGrok";
import { useEffect, useRef } from "react";

const prompt = `
请提供关于用户提供文本的详细解释，包括以下方面：
1. 词源: 解释该词的起源、词根，以及它是如何演变而来的。
2. 发音: 描述该词的发音，包括任何语音上的细微差别。
3. 定义: 提供该词的主要含义以及任何次要含义。
4. 用法: 给出使用该词的句子示例，并展示在不同语境下的用法。
5. 同义词和反义词: 列出同义词和反义词，并解释它们在意义或用法上的区别。
6. 相关词汇: 提及任何相关词汇或衍生词，并解释它们与原词的关联。
7. 文化或历史背景: 提供任何相关的文化或历史信息，以帮助理解该词的使用或意义。
`;

export default function Lookup({ launchContext }: LaunchProps) {
  const { textStream, isLoading, lastQuery, submit } = useGrok(prompt, launchContext);
  const hasInitialized = useRef(false);

  // 获取选中的文本或剪切板文本
  useEffect(() => {
    // 防止重复执行
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const acquireText = async () => {
      try {
        // 首先尝试获取选中的文本
        let text = "";
        try {
          text = await getSelectedText();
          console.debug("Acquired selected text:", text);
        } catch {
          // 如果没有选中文本，则获取剪切板的最近一条文本
          const clipboardText = await Clipboard.readText();
          text = clipboardText || "";
          console.debug("Acquired clipboard text:", text);
        }

        if (text) {
          submit(text);
        } else {
          throw new Error("No text available");
        }
      } catch (error) {
        console.error("Acquired text failed:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Acquired text failed",
          message: "Please ensure that text is selected or available in clipboard",
        });
      }
    };

    acquireText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  return <DetailUI textStream={textStream} isLoading={isLoading} lastQuery={lastQuery} />;
}
