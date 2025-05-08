import { Action, Toast, showToast, Clipboard, showHUD, Icon } from "@raycast/api";
import { Prompt } from "../types";
import * as fs from "fs/promises";
import { homedir } from "os";
import path from "path";
import { showFailureToast } from "@raycast/utils";

interface ExportPromptsActionProps {
  prompts: Prompt[];
}

export function ExportPromptsAction({ prompts }: ExportPromptsActionProps) {
  const handleExport = async () => {
    try {
      // 生成默认文件名
      const fileName = `quick-prompts-${new Date().toISOString().slice(0, 10)}.json`;
      // 使用用户的桌面作为默认保存位置
      const defaultSavePath = path.join(homedir(), "Desktop", fileName);

      // 生成 JSON 内容
      const jsonContent = JSON.stringify(prompts, null, 2);

      // 先将内容复制到剪贴板
      await Clipboard.copy(jsonContent);

      // 保存文件到桌面
      await fs.writeFile(defaultSavePath, jsonContent, "utf-8");

      // 显示多个提示，但不关闭窗口
      await showToast({
        style: Toast.Style.Success,
        title: "Export Success",
        message: `Saved to desktop: ${fileName}`,
      });

      // 使用 HUD 提示但不关闭窗口
      await showHUD("JSON data copied to clipboard and saved to desktop");
    } catch (error) {
      showFailureToast(error, { title: "Export Failed" });
    }
  };

  return (
    <Action
      title="Export Prompts"
      icon={Icon.SaveDocument}
      onAction={handleExport}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    />
  );
}
