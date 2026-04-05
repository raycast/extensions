import { showToast, Toast, Icon } from "@raycast/api";
import { exec } from "child_process";
import { CommandDef } from "./types";

/**
 * 内置命令列表
 * 可通过 Preferences 中的 customCommands 扩展
 */
export const BUILTIN_COMMANDS: CommandDef[] = [
  {
    id: "iterm",
    label: "Open in iTerm2",
    template: "open -a iTerm {path}",
    icon: Icon.Terminal,
    shortcut: { modifiers: ["cmd"], key: "t" },
  },
  {
    id: "agy",
    label: "Open with Antigravity",
    template: "agy {path}",
    icon: Icon.Terminal,
    shortcut: { modifiers: ["cmd"], key: "g" },
  },
  {
    id: "idea",
    label: "Open in IDEA",
    template: "idea {path}",
    icon: Icon.Code,
    shortcut: { modifiers: ["cmd"], key: "i" },
  },
  {
    id: "pycharm",
    label: "Open in PyCharm",
    template: "pycharm {path}",
    icon: Icon.Code,
    shortcut: { modifiers: ["cmd"], key: "y" },
  },
  {
    id: "fork",
    label: "Open in Fork",
    template: "fork {path}",
    icon: Icon.Book,
    shortcut: { modifiers: ["cmd"], key: "f" },
  },
  {
    id: "vscode",
    label: "Open in VS Code",
    template: "code {path}",
    icon: Icon.Code,
    shortcut: { modifiers: ["cmd"], key: "v" },
  },
];

/**
 * 解析用户自定义命令字符串
 * @param raw - 格式: "name:template,name:template"
 * @returns 解析后的命令定义列表
 */
export function parseCustomCommands(raw: string | undefined): CommandDef[] {
  if (!raw || raw.trim() === "") return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.includes(":"))
    .map((item) => {
      const colonIdx = item.indexOf(":");
      const name = item.substring(0, colonIdx).trim();
      const template = item.substring(colonIdx + 1).trim();
      return {
        id: name,
        label: `Open with ${name}`,
        template,
        icon: Icon.Terminal,
      };
    });
}

/**
 * 获取完整的命令列表（内置 + 自定义）
 */
export function getAllCommands(customCommandsRaw?: string): CommandDef[] {
  const custom = parseCustomCommands(customCommandsRaw);
  return [...BUILTIN_COMMANDS, ...custom];
}

/**
 * 执行命令
 * 将模板中的 {path} 替换为项目路径，通过 shell 执行
 */
export async function executeCommand(
  command: CommandDef,
  projectPath: string,
): Promise<void> {
  const cmd = command.template.replace("{path}", projectPath);

  // 获取用户的 shell 环境变量（确保 PATH 包含 IDE 命令）
  const shellCmd = `source ~/.zshrc 2>/dev/null; ${cmd}`;

  return new Promise((resolve) => {
    exec(shellCmd, { shell: "/bin/zsh" }, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "命令执行失败",
          message: `${cmd}: ${error.message}`,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "已执行",
          message: cmd,
        });
      }
      resolve();
    });
  });
}
