import {
  Clipboard,
  showHUD,
  getSelectedText,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import type { Preferences } from "@raycast/api";
import { getApiClient } from "./api";

// Quick Add - create note from selected text or clipboard

const QUICK_ADD_TAGS_KEY = "quick_add_default_tags";

export default async function QuickAdd() {
  const preferences = getPreferenceValues<Preferences>();
  let content = "";

  // 优先使用选中的文字
  try {
    const selectedText = await getSelectedText();
    if (selectedText && selectedText.trim()) {
      content = selectedText.trim();
    }
  } catch {
    // 没有选中文字，试试剪贴板
  }

  // 如果没有选中文字，尝试用剪贴板
  if (!content) {
    try {
      const clipboard = await Clipboard.readText();
      if (clipboard && clipboard.trim()) {
        content = clipboard.trim();
      }
    } catch {
      // 剪贴板也没东西
    }
  }

  // 还是没有内容，提示用户
  if (!content) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Content",
      message: "请先选中文字或复制内容",
    });
    return;
  }

  // 创建笔记
  try {
    const api = getApiClient();

    // 优先从 Config Quick Add 读取标签
    let tags: string[] | undefined;
    try {
      const stored = await LocalStorage.getItem<string>(QUICK_ADD_TAGS_KEY);
      if (stored) {
        const configTags = JSON.parse(stored) as unknown as string[];
        if (configTags.length > 0) {
          tags = configTags;
        }
      }
    } catch {
      // ignore
    }

    // 如果没有配置，则使用 preference 设置
    if (!tags) {
      const tagSetting = (
        preferences.quickAddTag as unknown as string | undefined
      )?.trim();
      if (tagSetting) {
        tags = tagSetting
          .split(/[,\s]+/)
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      }
    }

    await api.createNote({
      content,
      tags: tags && tags.length > 0 ? tags : undefined,
      state: "private",
    });

    await showHUD("✅ Note saved!");
  } catch (error) {
    await showHUD("❌ Failed to save note");
    console.error("Quick add failed:", error);
  }
}
