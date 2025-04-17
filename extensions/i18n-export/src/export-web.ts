import { showHUD, Toast, getPreferenceValues } from "@raycast/api";
import { getNotionData } from "./notion-api";
import { exportToWebJson } from "./export-handlers";

interface Preferences {
  notionApiKey: string;
  notionDatabaseId: string;
  webOutputPath?: string; // 可选
}

export default async function main() {
  let toast: Toast | undefined;

  try {
    // 获取设置的值
    const preferences = getPreferenceValues<Preferences>();

    // 检查Web输出路径是否已配置
    if (!preferences.webOutputPath) {
      await showHUD("❌ 错误: 未设置Web输出路径");
      return;
    }

    // 显示加载状态
    toast = new Toast({
      style: Toast.Style.Animated,
      title: "正在从Notion导出i18n数据",
    });
    await toast.show();

    // 从Notion获取数据
    const data = await getNotionData(preferences.notionApiKey, preferences.notionDatabaseId);

    if (!data) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "导出失败";
        toast.message = "Notion数据库中没有找到数据";
      }
      return;
    }

    // 导出到Web格式
    if (toast) {
      toast.title = "正在导出到Web格式";
    }
    const success = await exportToWebJson(data, preferences.webOutputPath);

    if (success) {
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "导出成功";
        toast.message = `已导出 ${data.entries.length} 条翻译到Web格式`;
      }
      await showHUD("✅ Web i18n导出成功");
    } else {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "导出失败";
        toast.message = "导出到Web格式时出错";
      }
    }
  } catch (error) {
    console.error("导出过程中出错:", error);
    await showHUD("❌ 导出失败");

    // 显示错误消息
    await new Toast({
      style: Toast.Style.Failure,
      title: "导出失败",
      message: error instanceof Error ? error.message : String(error),
    }).show();
  }
}
