import { t } from "../i18n.js";

/**
 * 文件大小文案。此前三处详情页直接拼 `{size} bytes`,中文界面里混着一个英文单位。
 * 大于 1KB 之后 KB / MB 中英通用,只有"字节"这个词要翻译
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return t("common.fileSizeBytes", { size: bytes });
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
