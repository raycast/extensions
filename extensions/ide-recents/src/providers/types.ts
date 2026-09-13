/**
 * IDEProvider — 多 IDE 抽象层核心接口
 *
 * 每个 IDE（VS Code、Trae、Antigravity 等）实现该接口，
 * 提供数据库路径、打开命令和品牌信息。
 * 新增 IDE 只需创建一个新文件并在 registry.ts 中注册。
 */

export interface IDEProvider {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 品牌色（HEX） */
  color: string;
  /** 候选数据库路径列表（按优先级排列，取第一个存在的） */
  getDatabasePaths(): string[];
  /** 打开项目的 shell 命令列表（按优先级依次尝试） */
  getOpenCommands(projectPath: string): string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  path: string;
  type: "folder" | "workspace" | "remote" | "file";
  extension: string;
  /** 项目来源 IDE 列表（同一路径可能被多个 IDE 打开过） */
  sources: string[];
  /** 本地文件是否存在（对于 remote 默认为 true） */
  exists?: boolean;
}
