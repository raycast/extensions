import { Application } from "@raycast/api";

/**
 * @description: 插件偏好设置
 * @return {*}
 */
export interface Preferences {
  workspaces: string;
  defaultEditor: Application;
  defaultGitApp: Application;
  defaultTerminalApp: Application;
}

/**
 * @description: 项目查找返回结果条目
 * @return {*}
 */
export interface ResultItem {
  name: string;
  path?: string;
  description?: string;
  hits?: string;
  type?: string;
  icon: string;
  idePath?: string;
  arg?: string;
  refresh?: boolean;
}
