import { LaunchProps, BrowserExtension, showToast, Toast, environment } from "@raycast/api";
import DetailUI from "./ui/DetailUI";
import { useGrok } from "./hooks/useGrok";
import { useEffect, useRef } from "react";

const prompt = `You are a professional content summarizer. Please analyze the provided webpage content and create a comprehensive summary that includes:

1. **Main Topic**: What is this webpage primarily about?
2. **Key Points**: List the most important information, findings, or arguments presented
3. **Structure**: How is the content organized? (sections, categories, etc.)
4. **Target Audience**: Who is this content intended for?
5. **Actionable Insights**: What can readers do with this information?
6. **Conclusion**: Summarize the main takeaway or conclusion

Please provide the summary in Chinese, and make it detailed but concise. Focus on extracting the most valuable information for the reader.`;

export default function SummarizeSite({ launchContext }: LaunchProps) {
  const { textStream, isLoading, lastQuery, submit } = useGrok(prompt, launchContext);
  const hasInitialized = useRef(false);

  // 获取Chrome浏览器当前活跃标签页的内容
  useEffect(() => {
    // 防止重复执行
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const getWebContent = async () => {
      try {
        // 检查是否支持浏览器扩展API
        if (!environment.canAccess(BrowserExtension)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "需要安装浏览器扩展",
            message: "请先安装Raycast浏览器扩展以获取网页内容",
          });
          return;
        }

        // 获取当前活跃标签页的内容，使用markdown格式以获得更好的结构化内容
        const webpageContent = await BrowserExtension.getContent({
          format: "markdown",
        });

        if (webpageContent && webpageContent.trim()) {
          // 获取标签页信息以显示网页标题和URL
          const tabs = await BrowserExtension.getTabs();
          const activeTab = tabs.find(tab => tab.active);

          let contentToSummarize = webpageContent;
          if (activeTab) {
            contentToSummarize = `网页标题: ${activeTab.title || "未知标题"}\n网页URL: ${activeTab.url || "未知URL"}\n\n网页内容:\n${webpageContent}`;
          }

          await showToast({
            style: Toast.Style.Success,
            title: "已获取网页内容",
            message: "正在使用Grok AI分析和总结...",
          });

          submit(contentToSummarize);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "无法获取网页内容",
            message: "当前标签页可能没有可读取的内容或页面正在加载中",
          });
        }
      } catch (error) {
        console.error("获取网页内容失败:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "获取网页内容失败",
          message: "请确保Chrome浏览器已打开且有活跃的标签页，并已安装Raycast浏览器扩展",
        });
      }
    };

    getWebContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  return <DetailUI textStream={textStream} isLoading={isLoading} lastQuery={lastQuery} />;
}
