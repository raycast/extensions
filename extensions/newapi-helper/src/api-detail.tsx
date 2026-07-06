import { Detail, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import {
  QUOTA_TO_USD,
  getRefreshIntervalMs,
  type ApiStatusSnapshot,
  useApiStatus,
  usePollingRefreshToken,
} from "./lib/api";
import type { ApiConfig, UserData } from "./lib/types";

function buildMarkdown(cfg: ApiConfig, userData: UserData, status: ApiStatusSnapshot): string {
  const remainingUsd = status.balanceUsd ?? userData.quota / QUOTA_TO_USD;
  const usedUsd = status.totalUsedUsd ?? userData.used_quota / QUOTA_TO_USD;
  const rows = [
    `## ${cfg.name}`,
    "",
    `| | |`,
    `|---|---|`,
    `| **Status** | ${status.statusText} |`,
    `| **User ID** | \`${userData.id}\` |`,
    `| **Plan** | ${userData.group || "default"} |`,
    `| **Requests** | ${userData.request_count.toLocaleString("en-US")} |`,
    `| **Balance** | **$${remainingUsd.toFixed(2)}** |`,
    `| **Total Used** | $${usedUsd.toFixed(2)} |`,
    `| **Today's Usage** | ${
      status.dataFetchFailed
        ? "*Fetch failed*"
        : status.todayUsageUsd !== null
          ? `**$${status.todayUsageUsd.toFixed(2)}**`
          : "*N/A*"
    } |`,
  ];

  if (status.statusDetail) {
    rows.push(`| **Query Note** | ${status.statusDetail} |`);
  }

  rows.push("", "---", "", `_${cfg.baseUrl} · ${new Date().toLocaleString("en-US")}_`);
  return rows.join("\n");
}

export default function ApiDetailView({ config }: { config: ApiConfig }) {
  const refreshToken = usePollingRefreshToken(getRefreshIntervalMs());
  const status = useApiStatus(config, refreshToken);

  let markdown = "# Querying account data...";

  if (status.state === "invalid") {
    markdown = `# ❌ Invalid API URL\n\n${status.statusDetail ?? "Re-save this station with a valid https:// URL."}`;
  } else if (status.state === "error" && !status.userData) {
    markdown = `# ❌ ${status.statusText}\n\n${status.statusDetail ?? "Check your Access Token and API URL."}`;
  } else if (status.userData) {
    markdown = buildMarkdown(config, status.userData, status);
  }

  return (
    <Detail
      isLoading={status.state === "loading"}
      markdown={markdown}
      navigationTitle={config.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open API Site" url={status.safeUrl ?? config.baseUrl} icon={Icon.Globe} />
          <Action.CopyToClipboard
            title="Copy Balance"
            content={status.balanceUsd !== null ? `$${status.balanceUsd.toFixed(2)}` : ""}
          />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={status.refresh} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
