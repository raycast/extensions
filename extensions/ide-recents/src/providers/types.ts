/**
 * IDEProvider — 多 IDE 抽象层核心接口
 *
 * 每个 IDE（VS Code、Trae、Antigravity 等）实现该接口，
 * 提供数据库路径、打开命令和品牌信息。
 * 新增 IDE 只需创建一个新文件并在 registry.ts 中注册。
 */

/**
 * 一条候选打开命令。
 *
 * 必须拆分成「可执行文件 + 参数数组」两部分，由调用方用 execFile 直接执行，
 * 不经过 shell；因此项目路径中包含空格、引号、$()、反引号等字符时，
 * 既不会被 shell 解释执行，也不会因为转义问题而打不开。
 */
export interface OpenCommand {
  /** 可执行文件的绝对路径，或 PATH 中的命令名 */
  command: string;
  /** 逐项传给可执行文件的参数（不拼接、不转义） */
  args: string[];
}

export interface IDEProvider {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 品牌色（HEX） */
  color: string;
  /**
   * 候选数据库路径列表（按优先级排列）。
   * 读取与清理会覆盖其中所有真实存在的库，而不只是第一个。
   */
  getDatabasePaths(): string[];
  /**
   * 打开项目的候选命令列表（按优先级依次尝试）。
   * 项目路径必须以独立参数传入，禁止拼接进 command 字符串。
   */
  getOpenCommands(projectPath: string): OpenCommand[];
}

export interface ProjectItem {
  id: string;
  name: string;
  /**
   * 供 IDE 打开的目标：
   * - 本地项目为文件系统路径；
   * - 远程 / 虚拟工作区（vscode-remote://、vscode-vfs:// 等）为原始 URI。
   */
  path: string;
  type: "folder" | "workspace" | "remote" | "file";
  extension: string;
  /** 项目来源 IDE 列表（同一路径可能被多个 IDE 打开过） */
  sources: string[];
  /** 本地路径是否存在；远程 / 虚拟工作区无法在本地校验，恒为 true */
  exists?: boolean;
}
