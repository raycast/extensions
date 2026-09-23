import { getPreferenceValues } from "@raycast/api";

// ponytail: Raycast manifest is static; the language preference localizes extension views, not Raycast's command/settings labels.
export function isChinese(): boolean {
  return getPreferenceValues<Preferences>().language === "zh-Hans";
}

export function t(english: string, chinese: string): string {
  return isChinese() ? chinese : english;
}

export function syncStatus(status: string): string {
  const labels: Record<string, [string, string]> = {
    idle: ["Idle", "空闲"], loading: ["Loading", "载入中"], writing: ["Saving", "写入中"],
    success: ["Up to date", "已同步"], error: ["Error", "错误"], conflict: ["Conflict", "冲突"],
  };
  const label = labels[status];
  return label ? t(...label) : status;
}
