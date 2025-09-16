import { ShodanAPIInfo } from "./shodan-api";

export interface UsageInfo {
  query: { used: number; total: number; percentage: number };
  scan: { used: number; total: number; percentage: number };
  monitored: { used: number; total: number; percentage: number };
}

export const calculateUsagePercentage = (used: number, total: number): number => {
  if (total === -1) return 0; // Unlimited
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
};

export const getUsageInfo = (apiInfo: ShodanAPIInfo): UsageInfo => {
  // Calculate usage percentages
  const queryUsed =
    apiInfo.usage_limits.query_credits === -1 ? 0 : apiInfo.usage_limits.query_credits - apiInfo.query_credits;
  const scanUsed =
    apiInfo.usage_limits.scan_credits === -1 ? 0 : apiInfo.usage_limits.scan_credits - apiInfo.scan_credits;
  const monitoredUsed = apiInfo.monitored_ips;

  const queryPercentage = calculateUsagePercentage(queryUsed, apiInfo.usage_limits.query_credits);
  const scanPercentage = calculateUsagePercentage(scanUsed, apiInfo.usage_limits.scan_credits);
  const monitoredPercentage = calculateUsagePercentage(monitoredUsed, apiInfo.usage_limits.monitored_ips);

  return {
    query: { used: queryUsed, total: apiInfo.usage_limits.query_credits, percentage: queryPercentage },
    scan: { used: scanUsed, total: apiInfo.usage_limits.scan_credits, percentage: scanPercentage },
    monitored: { used: monitoredUsed, total: apiInfo.usage_limits.monitored_ips, percentage: monitoredPercentage },
  };
};

export const generateAPIInfoMarkdown = (apiInfo: ShodanAPIInfo, usage: UsageInfo): string => {
  return `# 📊 Shodan API Usage Statistics

## 🔍 Query Credits
**Used:** ${usage.query.percentage}%  
**Used Credits:** ${usage.query.used.toLocaleString()}/${usage.query.total === -1 ? "∞" : usage.query.total.toLocaleString()}  
**Remaining Credits:** ${apiInfo.query_credits === -1 ? "Unlimited" : apiInfo.query_credits.toLocaleString()}/${apiInfo.usage_limits.query_credits === -1 ? "∞" : apiInfo.usage_limits.query_credits.toLocaleString()}

---

## 🔎 Scan Credits
**Used:** ${usage.scan.percentage}%  
**Used Credits:** ${usage.scan.used.toLocaleString()}/${usage.scan.total === -1 ? "∞" : usage.scan.total.toLocaleString()}  
**Remaining Credits:** ${apiInfo.scan_credits === -1 ? "Unlimited" : apiInfo.scan_credits.toLocaleString()}/${apiInfo.usage_limits.scan_credits === -1 ? "∞" : apiInfo.usage_limits.scan_credits.toLocaleString()}

---

## 👁️ Monitored IPs
**Used:** ${usage.monitored.percentage}%  
**Used Monitors:** ${usage.monitored.used.toLocaleString()}/${usage.monitored.total === -1 ? "∞" : usage.monitored.total.toLocaleString()}  
**Remaining Monitors:** ${apiInfo.monitored_ips === -1 ? "Unlimited" : apiInfo.monitored_ips.toLocaleString()}/${apiInfo.usage_limits.monitored_ips === -1 ? "∞" : apiInfo.usage_limits.monitored_ips.toLocaleString()}

---

> Account details are shown in the metadata panel on the right.`;
};

export const generateErrorMarkdown = (error: string): string => {
  return `# ❌ Error

**Failed to load API information**

${error}

Please check your API key and try again.`;
};

export const generateLoadingMarkdown = (): string => {
  return `# 🔄 Loading...

**Fetching your Shodan account information**

Please wait while we retrieve your API usage details.`;
};

export const generateNoDataMarkdown = (): string => {
  return `# ⚠️ No Data

**Unable to load API information**

Please check your connection and API key.`;
};
