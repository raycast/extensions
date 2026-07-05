import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { ApiConfig, UserApiResponse, DataApiResponse } from "./lib/types";
import { detectLang } from "./lib/i18n";

const QUOTA_TO_USD = 500_000;

const translations: Record<string, Record<string, string>> = {
  userId: { en: "User ID", "zh-Hans": "用户 ID" },
  plan: { en: "Plan", "zh-Hans": "套餐" },
  requests: { en: "Requests", "zh-Hans": "请求次数" },
  balance: { en: "Balance", "zh-Hans": "余额" },
  totalUsed: { en: "Total Used", "zh-Hans": "历史消耗" },
  today: { en: "Today's Usage", "zh-Hans": "今日用量" },
  loading: { en: "Fetching account data...", "zh-Hans": "正在获取账户数据..." },
  error: { en: "Error", "zh-Hans": "错误" },
  requestFailed: {
    en: "Request failed. Check your Access Token and API URL.",
    "zh-Hans": "请求失败，请检查访问令牌和 API 地址。",
  },
  parseFailed: { en: "Failed to parse response", "zh-Hans": "无法解析响应数据" },
  na: { en: "N/A", "zh-Hans": "暂无" },
};

function t(key: string): string {
  const dict = translations[key];
  if (!dict) return key;
  return dict[detectLang()] ?? dict["en"] ?? key;
}

/** Local midnight → now timestamps in seconds. */
function todayTimestamps(): { start: number; end: number } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    start: Math.floor(startOfDay.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
}

function sumTodayUsage(data: DataApiResponse | undefined): number | null {
  if (!data?.data || data.data.length === 0) return null;
  const total = data.data.reduce((sum, point) => sum + point.quota, 0);
  return total / QUOTA_TO_USD;
}

function buildMarkdown(
  cfg: ApiConfig,
  userData: NonNullable<UserApiResponse["data"]>,
  todayUsageUsd: number | null,
): string {
  const remainingUsd = userData.quota / QUOTA_TO_USD;
  const usedUsd = userData.used_quota / QUOTA_TO_USD;

  const rows = [
    `## ${cfg.name}`,
    "",
    `| | |`,
    `|---|---|`,
    `| **${t("userId")}** | \`${userData.id}\` |`,
    `| **${t("plan")}** | ${userData.group || "default"} |`,
    `| **${t("requests")}** | ${userData.request_count.toLocaleString()} |`,
    `| **${t("balance")}** | **$${remainingUsd.toFixed(2)}** |`,
    `| **${t("totalUsed")}** | $${usedUsd.toFixed(2)} |`,
    `| **${t("today")}** | ${todayUsageUsd !== null ? `**$${todayUsageUsd.toFixed(2)}**` : `*${t("na")}*`} |`,
    "",
    "---",
    "",
    `_${cfg.baseUrl} · ${new Date().toLocaleString(detectLang() === "zh-Hans" ? "zh-CN" : "en-US")}_`,
  ];

  return rows.join("\n");
}

export default function ApiDetailView({ config }: { config: ApiConfig }) {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const { start, end } = todayTimestamps();

  const userFetch = useFetch<UserApiResponse>(`${baseUrl}/api/user/self`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.accessToken}`,
      "New-Api-User": config.userId,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    keepPreviousData: false,
  });
  const dataFetch = useFetch<DataApiResponse>(
    `${baseUrl}/api/data/self?start_timestamp=${start}&end_timestamp=${end}&default_time=hour`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.accessToken}`,
        "New-Api-User": config.userId,
      },
      keepPreviousData: false,
    },
  );

  const isLoading = userFetch.isLoading || dataFetch.isLoading;
  const todayUsageUsd = sumTodayUsage(dataFetch.data);
  const userData = userFetch.data;

  let markdown = `# ${t("loading")}`;
  let hasError = false;

  if (userFetch.error) {
    markdown = `# ❌ ${t("error")}\n\n${t("requestFailed")}\n\n\`${userFetch.error.message}\``;
    hasError = true;
  } else if (!userFetch.isLoading && userData) {
    if (!userData.success || !userData.data) {
      markdown = `# ❌ ${userData.message || t("parseFailed")}`;
      hasError = true;
    } else {
      markdown = buildMarkdown(config, userData.data, todayUsageUsd);
    }
  }

  return (
    <Detail
      isLoading={isLoading && !hasError}
      markdown={markdown}
      navigationTitle={config.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open API Site" url={config.baseUrl} icon={Icon.Globe} />
          <Action.CopyToClipboard
            title="Copy Balance"
            content={userData?.data ? `$${(userData.data.quota / QUOTA_TO_USD).toFixed(2)}` : ""}
          />
        </ActionPanel>
      }
    />
  );
}
