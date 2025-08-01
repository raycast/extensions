export function stripMarkdown(content: string): string {
  return (
    content
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, "")
      // 移除粗体和斜体
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // 移除代码块
      .replace(/```[\s\S]*?```/g, "[代码块]")
      .replace(/`([^`]+)`/g, "$1")
      // 移除链接
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 移除图片
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "[图片: $1]")
      // 移除引用
      .replace(/^>\s+/gm, "")
      // 移除列表标记
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // 移除多余的空白
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function truncateText(text: string, maxLength: number = 100): string {
  const stripped = stripMarkdown(text);
  if (stripped.length <= maxLength) {
    return stripped;
  }
  return stripped.substring(0, maxLength) + "...";
}

export function extractTitle(content: string): string {
  // 尝试从内容中提取标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // 如果没有找到标题，使用第一行
  const firstLine = content.split("\n")[0].trim();
  return stripMarkdown(firstLine).substring(0, 50) || "无标题";
}
