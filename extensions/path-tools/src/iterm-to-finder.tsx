import { showToast, Toast } from "@raycast/api";
import { openItermDirectoryInFinder } from "./macos";

export default async function ItermToFinderCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "正在从 iTerm 打开 Finder",
  });

  try {
    await openItermDirectoryInFinder();
    toast.style = Toast.Style.Success;
    toast.title = "已请求在 Finder 中打开当前目录";
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "无法打开 Finder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
