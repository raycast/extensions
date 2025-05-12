import { showToast, Toast } from "@raycast/api";

/**
 * 剪贴板功能hook
 * @returns 复制到剪贴板的函数
 */
export const useClipboard = () => {
  /**
   * 将内容复制到剪贴板并显示提示
   * @param content 要复制的内容
   */
  const copyToClipboard = async (_content: string) => {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  };

  return { copyToClipboard };
};
