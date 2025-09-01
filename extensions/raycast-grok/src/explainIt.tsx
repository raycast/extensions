import { getSelectedText, LaunchProps, showToast, Toast, Clipboard } from "@raycast/api";
import DetailUI from "./ui/DetailUI";
import { useGrok } from "./hooks/useGrok";
import { useEffect, useRef } from "react";

const prompt = "Please explain the text in detail";

export default function ExplainIt({ launchContext }: LaunchProps) {
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
