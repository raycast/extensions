import { getPreferenceValues } from "@raycast/api";

export const preferences = getPreferenceValues<Preferences>();

export const availableLanguages = ["en", "zh"] as const;
export type Language = (typeof availableLanguages)[number];

export const dictionary = {
  en: {
    searchPlaceholder: "Enter IP address (leave empty for current IP)",
    searchResult: "Search Result",
    yourIp: "Your IP Address",
    unknownIp: "Unknown IP",
    fetching: "Fetching IP information...",
    history: "History",
    error: "Error",
    errorFetch: "Failed to fetch IP information.",
    copyIp: "Copy IP",
    copyJson: "Copy Full JSON",
    removeFromHistory: "Remove from History",
    clearHistory: "Clear All History",
    failedSaveHistory: "Failed to save history",
    viaIpip: "Via myip.ipip.net",
    viaLocal: "Via Local Connection",
    ipAddress: "IP Address",
    city: "City",
    region: "Region",
    country: "Country",
    isp: "ISP",
    timezone: "Timezone",
    latitude: "Latitude",
    longitude: "Longitude",
  },
  zh: {
    searchPlaceholder: "输入 IP 地址 (留空查询当前 IP)",
    searchResult: "搜索结果",
    yourIp: "您的 IP 地址",
    unknownIp: "未知 IP",
    fetching: "正在获取 IP 信息...",
    history: "历史记录",
    error: "错误",
    errorFetch: "获取 IP 信息失败。",
    copyIp: "复制 IP",
    copyJson: "复制完整 JSON",
    removeFromHistory: "从历史记录移除",
    clearHistory: "清空历史记录",
    failedSaveHistory: "保存历史记录失败",
    viaIpip: "通过 myip.ipip.net",
    viaLocal: "通过本地连接",
    ipAddress: "IP 地址",
    city: "城市",
    region: "地区",
    country: "国家",
    isp: "运营商",
    timezone: "时区",
    latitude: "纬度",
    longitude: "经度",
  },
};
