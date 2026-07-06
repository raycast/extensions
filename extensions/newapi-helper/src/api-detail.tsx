import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { ApiConfig, UserApiResponse, DataApiResponse } from "./lib/types";

const QUOTA_TO_USD = 500_000;

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
  let total = 0;
  for (const point of data.data) {
    const q = point.quota;
    if (typeof q !== "number" || isNaN(q)) continue;
    total += q;
  }
  return total / QUOTA_TO_USD;
}

function buildMarkdown(
  cfg: ApiConfig,
  userData: NonNullable<UserApiResponse["data"]>,
  todayUsageUsd: number | null,
  dataFetchFailed: boolean,
): string {
  const remainingUsd = userData.quota / QUOTA_TO_USD;
  const usedUsd = userData.used_quota / QUOTA_TO_USD;

  const rows = [
    `## ${cfg.name}`,
    "",
    `| | |`,
    `|---|---|`,
    `| **User ID** | \`${userData.id}\` |`,
    `| **Plan** | ${userData.group || "default"} |`,
    `| **Requests** | ${userData.request_count.toLocaleString("en-US")} |`,
    `| **Balance** | **$${remainingUsd.toFixed(2)}** |`,
    `| **Total Used** | $${usedUsd.toFixed(2)} |`,
    `| **Today's Usage** | ${
      dataFetchFailed ? "*Fetch failed*" : todayUsageUsd !== null ? `**$${todayUsageUsd.toFixed(2)}**` : "*N/A*"
    } |`,
    "",
    "---",
    "",
    `_${cfg.baseUrl} · ${new Date().toLocaleString("en-US")}_`,
  ];

  return rows.join("\n");
}

function apiUrl(base: string, path: string): string {
  return new URL(path, base).toString();
}

function validateStoredUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export default function ApiDetailView({ config }: { config: ApiConfig }) {
  const safeUrl = validateStoredUrl(config.baseUrl);
  const urlError = safeUrl === null;
  const { start, end } = todayTimestamps();

  const userFetch = useFetch<UserApiResponse>(urlError ? "" : apiUrl(config.baseUrl, "/api/user/self"), {
    headers: urlError
      ? undefined
      : {
          Accept: "application/json",
          Authorization: `Bearer ${config.accessToken}`,
          "New-Api-User": config.userId,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
    keepPreviousData: false,
    execute: !urlError,
  });

  const dataFetch = useFetch<DataApiResponse>(
    urlError
      ? ""
      : apiUrl(config.baseUrl, `/api/data/self?start_timestamp=${start}&end_timestamp=${end}&default_time=hour`),
    {
      method: "GET",
      headers: urlError
        ? undefined
        : {
            Accept: "application/json",
            Authorization: `Bearer ${config.accessToken}`,
            "New-Api-User": config.userId,
          },
      keepPreviousData: false,
      execute: !urlError,
    },
  );

  const isLoading = urlError ? false : userFetch.isLoading || dataFetch.isLoading;
  const todayUsageUsd = urlError ? null : sumTodayUsage(dataFetch.data);
  const userData = userFetch.data;

  let markdown = "# Fetching account data...";
  let hasError = false;

  if (urlError) {
    markdown =
      "# ❌ Unsafe API URL\n\nThis API configuration has an invalid or insecure URL. It was likely saved before URL validation was added. Delete it and re-add with a valid `https://` URL.";
    hasError = true;
  } else if (userFetch.error) {
    markdown = `# ❌ Error\n\nRequest failed. Check your Access Token and API URL.\n\n\`${userFetch.error.message}\``;
    hasError = true;
  } else if (!userFetch.isLoading && userData) {
    if (!userData.success || !userData.data) {
      markdown = `# ❌ ${userData.message || "Failed to parse response"}`;
      hasError = true;
    } else {
      markdown = buildMarkdown(config, userData.data, todayUsageUsd, Boolean(dataFetch.error));
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
