import { showHUD, Toast, getPreferenceValues } from "@raycast/api";
import { getNotionData } from "./notion-api";
import { exportToWebJson, exportToIosFiles } from "./export-handlers";

interface Preferences {
  notionApiKey: string;
  notionDatabaseId: string;
  webOutputPath?: string; // 可选
  iosOutputPath?: string; // 可选
}

export default async function main() {
  let toast: Toast | undefined;

  try {
    // 获取设置的值
    const preferences = getPreferenceValues<Preferences>();

    // 检查是否至少设置了一个输出路径
    const hasWebPath = !!preferences.webOutputPath;
    const hasIosPath = !!preferences.iosOutputPath;

    if (!hasWebPath && !hasIosPath) {
      await showHUD("❌ 错误: 未设置任何输出路径");
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

    // 初始化状态变量
    let webSuccess = false;
    let iosSuccess = false;
    let webAttempted = false;
    let iosAttempted = false;

    // 导出到Web格式（如果设置了路径）
    if (hasWebPath) {
      webAttempted = true;
      if (toast) {
        toast.title = "正在导出到Web格式";
      }
      webSuccess = await exportToWebJson(data, preferences.webOutputPath!);
    }

    // 导出到iOS格式（如果设置了路径）
    if (hasIosPath) {
      iosAttempted = true;
      if (toast) {
        toast.title = "正在导出到iOS格式";
      }
      iosSuccess = await exportToIosFiles(data, preferences.iosOutputPath!);
    }

    // 处理导出结果
    if (webAttempted && webSuccess && iosAttempted && iosSuccess) {
      // 两种格式都成功导出
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "导出成功";
        toast.message = `已导出 ${data.entries.length} 条翻译到Web和iOS格式`;
      }
      await showHUD("✅ Web和iOS i18n导出成功");
    } else if (webAttempted && webSuccess && !iosAttempted) {
      // 只导出了Web格式，且成功
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "导出成功";
        toast.message = `已导出 ${data.entries.length} 条翻译到Web格式`;
      }
      await showHUD("✅ Web i18n导出成功");
    } else if (!webAttempted && iosAttempted && iosSuccess) {
      // 只导出了iOS格式，且成功
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "导出成功";
        toast.message = `已导出 ${data.entries.length} 条翻译到iOS格式`;
      }
      await showHUD("✅ iOS i18n导出成功");
    } else {
      // 至少有一种格式导出失败
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "部分导出失败";

        if (webAttempted && !webSuccess && iosAttempted && !iosSuccess) {
          toast.message = "Web和iOS格式都导出失败";
        } else if (webAttempted && !webSuccess) {
          toast.message = "Web格式导出失败";
        } else if (iosAttempted && !iosSuccess) {
          toast.message = "iOS格式导出失败";
        }
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
