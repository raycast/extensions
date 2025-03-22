import {
  BrowserExtension,
  Clipboard,
  environment,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

export default async function command() {
  try {
    // 显示初始加载提示
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "正在检查浏览器扩展...",
    });

    // 检查浏览器扩展是否可用
    if (!environment.canAccess(BrowserExtension)) {
      toast.style = Toast.Style.Failure;
      toast.title = "浏览器扩展未安装";
      toast.message = "请先安装 Raycast 浏览器扩展";

      // 显示额外的HUD提示
      await showHUD("请安装并启用 Raycast 浏览器扩展");
      return;
    }

    toast.title = "正在提取链接...";

    try {
      // 获取当前浏览器页面的 HTML 内容和标题
      const [content, pageTitle] = await Promise.all([
        BrowserExtension.getContent({ format: "html" }),
        BrowserExtension.getContent({ format: "text", cssSelector: "title" }),
      ]);

      // 如果内容为空，可能是浏览器扩展未正确工作
      if (!content || content.trim() === "") {
        toast.style = Toast.Style.Failure;
        toast.title = "无法获取页面内容";
        toast.message = "请确认浏览器扩展已授权并正常工作";
        await showHUD("未获取到页面内容，请检查浏览器扩展权限");
        return;
      }

      // 使用正则表达式提取所有链接
      const title = pageTitle || "未知页面";
      const baseUrl = await getCurrentTabUrl();
      const links = extractLinks(content, baseUrl);

      // 格式化为 Markdown
      let markdownLinks = `# 从 "${title}" 提取的链接\n\n`;

      if (links.length === 0) {
        markdownLinks += "没有找到链接。\n";
      } else {
        links.forEach((link) => {
          markdownLinks += `- [${link.text}](${link.url})\n`;
        });
      }

      // 复制到剪贴板
      await Clipboard.copy(markdownLinks);

      // 显示成功提示
      toast.style = Toast.Style.Success;
      toast.title = "链接提取成功";
      toast.message = `已复制 ${links.length} 个链接到剪贴板`;

      // 同时在 HUD 显示
      await showHUD(`已复制 ${links.length} 个链接到剪贴板`);
    } catch (contentError) {
      // 处理获取内容或解析过程中的错误
      toast.style = Toast.Style.Failure;
      toast.title = "内容提取过程出错";
      toast.message =
        contentError instanceof Error
          ? contentError.message
          : String(contentError);

      console.error("内容提取详细错误:", contentError);
      await showHUD("提取链接失败，详见日志");
    }
  } catch (error) {
    // 处理整体流程错误
    console.error("扩展执行出错:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "扩展执行失败",
      message: error instanceof Error ? error.message : String(error),
    });

    await showHUD("执行失败，请检查控制台日志");
  }
}

// 提取链接的辅助函数
interface Link {
  text: string;
  url: string;
}

function extractLinks(html: string, baseUrl: string): Link[] {
  const links: Link[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const originRegex = /^(https?:\/\/[^/]+)/i; // 修改这里，删除了斜杠的转义

  let origin = "";
  const originMatch = originRegex.exec(baseUrl);
  if (originMatch) {
    origin = originMatch[1];
  }

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    let cleanText = match[2].replace(/<[^>]+>/g, "").trim(); // 移除HTML标签

    if (!cleanText) {
      cleanText = url; // 如果链接文本为空，使用URL作为文本
    }

    // 处理相对链接
    let fullUrl = url;
    if (
      url &&
      !url.startsWith("http") &&
      !url.startsWith("mailto:") &&
      !url.startsWith("#")
    ) {
      if (url.startsWith("/")) {
        fullUrl = `${origin}${url}`;
      } else {
        const basePath = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
        fullUrl = `${basePath}${url}`;
      }
    }

    links.push({
      text: cleanText || fullUrl,
      url: fullUrl,
    });
  }

  return links;
}

// 获取当前标签页的URL
async function getCurrentTabUrl(): Promise<string> {
  try {
    // 通过浏览器扩展获取当前URL
    const pageUrl = await BrowserExtension.getContent({
      cssSelector: "link[rel='canonical']",
      format: "html",
    });

    // 提取href属性
    const match = pageUrl.match(/href=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1];
    }

    // 备用方法，尝试获取窗口的location
    await BrowserExtension.getContent({
      format: "text",
      cssSelector: "body", // 我们将通过js获取URL
    });

    return "https://example.com"; // 默认值，应该很少使用到
  } catch (error) {
    console.error("获取当前标签页URL失败:", error);
    return "https://example.com";
  }
}
