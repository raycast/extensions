import { environment } from "@raycast/api";

// 所有 console 日志的前缀，方便在 Raycast 的开发者日志里筛选。取 package.json 的 name，两个仓库共用这一份。
export const LOG_PREFIX = `[${environment.extensionName}]`;
