import { execFile } from "child_process";
import { homedir } from "os";
import path from "path";
import type { OpenCommand } from "../providers/types";

/**
 * Raycast 以 GUI 进程运行，默认 PATH 很短
 * （通常是 /usr/bin:/bin:/usr/sbin:/sbin），
 * 因此在查找 IDE CLI 之前显式补齐常见的安装位置。
 */
const EXTRA_SEARCH_PATHS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  path.join(homedir(), ".local/bin"),
  path.join(homedir(), ".antigravity-ide/antigravity-ide/bin"),
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin",
  "/Applications/Trae.app/Contents/Resources/app/bin",
  "/Applications/Antigravity IDE.app/Contents/Resources/app/bin",
];

const EXEC_TIMEOUT_MS = 15000;
const EXEC_MAX_BUFFER = 4 * 1024 * 1024;

/** 构造执行 IDE CLI 时使用的环境变量 */
export function buildExecEnv(): NodeJS.ProcessEnv {
  const currentPath = process.env.PATH ? process.env.PATH.split(":") : [];
  const pathEntries = Array.from(
    new Set([...EXTRA_SEARCH_PATHS, ...currentPath].filter(Boolean)),
  );

  return {
    ...process.env,
    HOME: process.env.HOME || homedir(),
    PATH: pathEntries.join(":"),
  };
}

export interface CommandResult {
  success: boolean;
  error?: string;
}

/**
 * 执行一条打开命令。
 *
 * 使用 execFile 而非 exec：可执行文件与参数分开传递，不经过 shell。
 * 因此项目路径中即便包含空格、引号、$()、反引号、分号等字符，
 * 也只会被当作普通参数，既不会被解释执行，也不会因转义问题而打不开。
 */
export function runOpenCommand(command: OpenCommand): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command.command,
      command.args,
      {
        env: buildExecEnv(),
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: EXEC_MAX_BUFFER,
      },
      (error, _stdout, stderr) => {
        if (!error) {
          resolve({ success: true });
          return;
        }
        resolve({
          success: false,
          error: stderr?.trim() || error.message,
        });
      },
    );
  });
}

/** 按 POSIX 规则对单个参数加引号 */
function quoteForShell(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * 把一条打开命令渲染成可以直接粘进终端的字符串。
 * 仅用于展示 / 复制到剪贴板，不参与实际执行。
 */
export function formatOpenCommand(command: OpenCommand): string {
  return [command.command, ...command.args].map(quoteForShell).join(" ");
}
