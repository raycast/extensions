import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  open,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getRootDomain } from "./utils/domain-helpers";
import {
  buildApiUrl,
  callAdGuardAPI,
  getDnsServerId,
  DNSServerSettings,
  QueryLogResponse,
  getDeviceMap,
} from "./utils/adguard-api";

interface BlockedDomain {
  domain: string;
  blockedAt: string;
  attempts: number;
  filterRule?: string;
  deviceName?: string;
}

export default function GetQueryLog() {
  const [isLoading, setIsLoading] = useState(true);
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [minutes, setMinutes] = useState(1);

  useEffect(() => {
    loadBlockedDomains();
  }, [minutes]);

  async function loadBlockedDomains() {
    setIsLoading(true);
    try {
      const now = Date.now();
      const timeFromMillis = now - minutes * 60 * 1000;
      const timeToMillis = now;

      // Fetch device map (cached for 24 hours)
      let deviceMap: Record<string, string> = {};
      try {
        deviceMap = await getDeviceMap();
      } catch (error) {
        console.error("Failed to fetch device map:", error);
        // Continue without device names - we'll just show device IDs if available
      }

      const url = buildApiUrl(
        `/oapi/v1/query_log?time_from_millis=${timeFromMillis}&time_to_millis=${timeToMillis}&limit=1000`,
      );

      const response = await callAdGuardAPI(url);

      if (!response.ok) {
        throw new Error(`AdGuard API error: ${response.status}`);
      }

      const data = (await response.json()) as QueryLogResponse;

      // Fetch current whitelist to filter out unblocked domains
      const dnsServerId = getDnsServerId();
      const getUrl = buildApiUrl(`/oapi/v1/dns_servers/${dnsServerId}`);
      const getResponse = await callAdGuardAPI(getUrl);

      if (!getResponse.ok) {
        throw new Error(`Failed to get DNS server: ${getResponse.status}`);
      }

      const dnsServer = (await getResponse.json()) as {
        settings: DNSServerSettings;
      };

      // Extract whitelisted domains from rules (@@||domain.com^)
      const whitelistedDomains = new Set<string>();
      for (const rule of dnsServer.settings.user_rules_settings.rules) {
        const match = rule.match(/^@@\|\|(.+?)\^$/);
        if (match) {
          whitelistedDomains.add(match[1]);
        }
      }

      // Filter for blocked domains
      const blockedItems = data.items.filter((item) => {
        const isBlocked =
          item.filtering_info?.filtering_status === "REQUEST_BLOCKED" ||
          item.filtering_info?.filtering_status === "RESPONSE_BLOCKED";

        if (!isBlocked) return false;

        // Check if this domain or its root is whitelisted
        const domain = item.domain;
        const rootDomain = getRootDomain(domain);

        return !whitelistedDomains.has(domain) && !whitelistedDomains.has(rootDomain);
      });

      // Group by domain to show unique domains
      const uniqueDomains = new Map<string, { count: number; lastSeen: string; rule?: string; deviceId?: string }>();

      for (const item of blockedItems) {
        const existing = uniqueDomains.get(item.domain);
        if (existing) {
          existing.count++;
          if (new Date(item.time_iso) > new Date(existing.lastSeen)) {
            existing.lastSeen = item.time_iso;
            existing.rule = item.filtering_info?.filter_rule;
            existing.deviceId = item.device_id;
          }
        } else {
          uniqueDomains.set(item.domain, {
            count: 1,
            lastSeen: item.time_iso,
            rule: item.filtering_info?.filter_rule,
            deviceId: item.device_id,
          });
        }
      }

      const domains: BlockedDomain[] = Array.from(uniqueDomains.entries()).map(([domain, info]) => ({
        domain,
        blockedAt: info.lastSeen,
        attempts: info.count,
        filterRule: info.rule,
        deviceName: info.deviceId ? deviceMap[info.deviceId] || info.deviceId : undefined,
      }));

      if (domains.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No blocked domains found",
          message: `No blocked domains in the last ${minutes} minutes`,
        });
      }

      setBlockedDomains(domains);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading blocked domains",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function unblockDomain(domain: string, unblockRoot: boolean = false) {
    try {
      const domainToUnblock = unblockRoot ? getRootDomain(domain) : domain;
      const isActuallyRoot = domain === getRootDomain(domain);

      const confirmed = await confirmAlert({
        title: `Unblock ${domainToUnblock}?`,
        message:
          unblockRoot && !isActuallyRoot
            ? `This will unblock the root domain ${domainToUnblock} (which includes ${domain} and all other subdomains)`
            : `This will unblock ${domainToUnblock} and all its subdomains`,
        primaryAction: {
          title: "Unblock",
          style: Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) {
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Unblocking domain...",
      });

      const dnsServerId = getDnsServerId();
      const getUrl = buildApiUrl(`/oapi/v1/dns_servers/${dnsServerId}`);
      const getResponse = await callAdGuardAPI(getUrl);

      if (!getResponse.ok) {
        throw new Error(`Failed to get DNS server: ${getResponse.status}`);
      }

      const dnsServer = (await getResponse.json()) as {
        settings: DNSServerSettings;
      };
      const whitelistRule = `@@||${domainToUnblock}^`;

      // Check if already whitelisted
      if (dnsServer.settings.user_rules_settings.rules.includes(whitelistRule)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Already whitelisted",
          message: `${domainToUnblock} is already in the whitelist`,
        });
        return;
      }

      const updatedRules = [...dnsServer.settings.user_rules_settings.rules, whitelistRule];

      const putUrl = buildApiUrl(`/oapi/v1/dns_servers/${dnsServerId}/settings`);
      const putResponse = await callAdGuardAPI(putUrl, {
        method: "PUT",
        body: JSON.stringify({
          user_rules_settings: {
            enabled: dnsServer.settings.user_rules_settings.enabled,
            rules: updatedRules,
          },
        }),
      });

      if (!putResponse.ok) {
        throw new Error(`Failed to update settings: ${putResponse.status}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Unblocked ${domainToUnblock}`,
        message: "Test your service to confirm it's working",
      });

      // Immediately remove this domain from the UI
      setBlockedDomains((prev) => prev.filter((blocked) => blocked.domain !== domain));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error unblocking domain",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Sort domains by most recent
  const sortedDomains = [...blockedDomains].sort(
    (a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime(),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search blocked domains..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Window"
          value={minutes.toString()}
          onChange={(newValue) => setMinutes(parseInt(newValue) || 1)}
        >
          <List.Dropdown.Item title="Last 1 minute" value="1" />
          <List.Dropdown.Item title="Last 5 minutes" value="5" />
          <List.Dropdown.Item title="Last 10 minutes" value="10" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Blocked Queries in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              await closeMainWindow();
              const url =
                "https://adguard-dns.io/en/dashboard/statistics/query?limit=20&statuses%5B0%5D=REQUEST_BLOCKED&statuses%5B1%5D=RESPONSE_BLOCKED";
              await open(url);
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadBlockedDomains}
          />
        </ActionPanel>
      }
    >
      {blockedDomains.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Circle}
          title="No Blocked Domains"
          description={`No blocked domains found in the last ${minutes} minutes. Try expanding the time window or check back later.`}
        />
      ) : (
        sortedDomains.map((blocked) => {
          const rootDomain = getRootDomain(blocked.domain);
          const isRoot = blocked.domain === rootDomain;
          const maxLength = 50;
          const displayDomain =
            blocked.domain.length > maxLength ? blocked.domain.substring(0, maxLength) + "..." : blocked.domain;

          return (
            <List.Item
              key={blocked.domain}
              title={{
                value: displayDomain,
                tooltip: blocked.domain.length > maxLength ? blocked.domain : undefined,
              }}
              accessories={[
                { text: rootDomain, tooltip: `Root Domain: ${rootDomain}` },
                ...(blocked.deviceName ? [{ tag: blocked.deviceName }] : []),
                {
                  text: `${blocked.attempts} attempt${blocked.attempts !== 1 ? "s" : ""}`,
                },
                { date: new Date(blocked.blockedAt) },
              ]}
              actions={
                <ActionPanel>
                  {!isRoot && (
                    <Action
                      title={`Unblock Root (${rootDomain})`}
                      icon={Icon.Globe}
                      style={Action.Style.Regular}
                      onAction={() => unblockDomain(blocked.domain, true)}
                    />
                  )}
                  <Action
                    title={`Unblock ${blocked.domain}`}
                    icon={Icon.CheckCircle}
                    style={Action.Style.Regular}
                    onAction={() => unblockDomain(blocked.domain, false)}
                  />
                  <Action
                    title="Open Blocked Queries in Browser"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={async () => {
                      await closeMainWindow();
                      const url =
                        "https://adguard-dns.io/en/dashboard/statistics/query?limit=20&statuses%5B0%5D=REQUEST_BLOCKED&statuses%5B1%5D=RESPONSE_BLOCKED";
                      await open(url);
                    }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadBlockedDomains}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
