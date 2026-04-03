import {
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  showHUD,
} from "@raycast/api";
import { useMemo, useCallback, useState, useEffect } from "react";
import { parseAWSConfig, groupByAccount } from "./lib/aws-config";
import { AccountListItem } from "./components/ProfileListItem";
import { getDirectConsoleUrl } from "./lib/url-builder";
import { openUrl } from "./lib/browser";
import type { AccountGroup } from "./lib/types";
import {
  loadUsageCounts,
  getAccountUsageCount,
  type UsageData,
} from "./lib/usage-tracker";

const MAX_MULTI_SESSIONS = 5;

export default function ListProfiles() {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = preferences.awsConfigPath || "~/.aws/config";
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [usageData, setUsageData] = useState<UsageData>({});
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    loadUsageCounts().then((data) => {
      setUsageData(data);
      setIsLoadingUsage(false);
    });
  }, []);

  const refreshUsage = useCallback(() => {
    loadUsageCounts().then(setUsageData);
  }, []);

  const { accountGroups, error } = useMemo(() => {
    try {
      const config = parseAWSConfig(configPath);
      const groups = groupByAccount(config.profiles);
      return { accountGroups: groups, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { accountGroups: [] as AccountGroup[], error: message };
    }
  }, [configPath]);

  const sortedAccountGroups = useMemo(() => {
    return [...accountGroups].sort((a, b) => {
      const countA = getAccountUsageCount(usageData, a.accountId);
      const countB = getAccountUsageCount(usageData, b.accountId);
      return countB - countA;
    });
  }, [accountGroups, usageData]);

  const toggleSelection = useCallback((accountId: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        if (next.size >= MAX_MULTI_SESSIONS) {
          showToast({
            style: Toast.Style.Failure,
            title: "Multi-Session Limit",
            message: `AWS supports up to ${MAX_MULTI_SESSIONS} simultaneous sessions`,
          });
          return prev;
        }
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const openSelectedAccounts = useCallback(async () => {
    const selected = accountGroups.filter((g) =>
      selectedAccounts.has(g.accountId),
    );
    if (selected.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Accounts Selected",
        message: "Select accounts first with ⌘S, then open them all with ⌘⏎",
      });
      return;
    }

    // Open the first role of each selected account (up to 5)
    const toOpen = selected.slice(0, MAX_MULTI_SESSIONS);
    for (const account of toOpen) {
      const defaultProfile = account.roles[0]!;
      try {
        await openUrl(getDirectConsoleUrl(defaultProfile));
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open browser",
          message: String(e),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    await showHUD(
      `🚀 Opened ${toOpen.length} AWS console session${toOpen.length > 1 ? "s" : ""}`,
    );
    setSelectedAccounts(new Set());
  }, [accountGroups, selectedAccounts]);

  const clearSelection = useCallback(() => {
    setSelectedAccounts(new Set());
  }, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load AWS config",
      message: error,
    });
  }

  const selectionCount = selectedAccounts.size;
  const searchPlaceholder =
    selectionCount > 0
      ? `${selectionCount}/${MAX_MULTI_SESSIONS} selected — ⌘⏎ to open all`
      : "Search AWS SSO accounts… (⌘S to select for multi-session)";

  return (
    <List searchBarPlaceholder={searchPlaceholder} isLoading={isLoadingUsage}>
      {sortedAccountGroups.length === 0 && !error && (
        <List.EmptyView
          title="No SSO Accounts Found"
          description={`No AWS SSO profiles found in ${configPath}. Make sure your config file contains profiles with sso_account_id.`}
          icon={Icon.Warning}
        />
      )}

      {error && (
        <List.EmptyView
          title="Error Loading Config"
          description={error}
          icon={Icon.XMarkCircle}
        />
      )}

      {sortedAccountGroups.map((account) => (
        <AccountListItem
          key={account.accountId}
          account={account}
          isSelected={selectedAccounts.has(account.accountId)}
          selectionCount={selectionCount}
          usageCount={getAccountUsageCount(usageData, account.accountId)}
          onToggleSelect={toggleSelection}
          onOpenSelected={openSelectedAccounts}
          onClearSelection={clearSelection}
          onUsageTracked={refreshUsage}
        />
      ))}
    </List>
  );
}
