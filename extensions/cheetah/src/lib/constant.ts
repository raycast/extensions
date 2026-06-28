import { join } from "path";
import { environment } from "@raycast/api";

export const refreshKeyword = "[refresh]";

export const cachePath = join(environment.supportPath, "config.json");

// 错误代码对应的文字提示
export const ErrorCodeMessage: { [code: string]: string } = {
  "100": "File read failure",
  "101": "File write failure",
  "102": "File deletion failed",
  "103": "Working directory not configured",
  "104": "Cache file path not configured",
  "105": "System platform not configured",
  "106": "Environment variable read failure",
  "107": "Cache file write failure",
  "108": "Failed to read folder",
  "109": "Unknown terminal program, downgraded to folder open",
  "110": "No such item in the cache",
  "111": "Application path is empty",
  "112": "Please configure the default editor first",
  "113": "Please configure the Git GUI application first",
  "114": "Please configure the terminal application first",
};
