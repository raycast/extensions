import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import type { AccountGroup, SSOProfile } from "../lib/types";
import {
  getDirectConsoleUrl,
  getDirectConsoleUrlWithRegion,
  getSSOPortalUrl,
  getExportCommand,
  AWS_REGIONS,
} from "../lib/url-builder";
import { openUrl } from "../lib/browser";
import {
  loadUsageCounts,
  trackUsage,
  getUsageCount,
  type UsageData,
} from "../lib/usage-tracker";

/**
 * Map role names to colors.
 */
function getRoleColor(roleName: string): Color {
  const lower = roleName.toLowerCase();
  if (lower.includes("admin")) return Color.Red;
  if (lower.includes("poweruser")) return Color.Orange;
  if (
    lower.includes("readonly") ||
    lower.includes("read-only") ||
    lower.includes("viewonly")
  )
    return Color.Green;
  if (lower.includes("developer") || lower.includes("dev")) return Color.Blue;
  return Color.PrimaryText;
}

/**
 * Map role names to icons.
 */
function getRoleIcon(roleName: string): Icon {
  const lower = roleName.toLowerCase();
  if (lower.includes("admin")) return Icon.Shield;
  if (
    lower.includes("readonly") ||
    lower.includes("read-only") ||
    lower.includes("viewonly")
  )
    return Icon.Eye;
  if (lower.includes("developer") || lower.includes("dev")) return Icon.Code;
  if (lower.includes("poweruser")) return Icon.Bolt;
  return Icon.Person;
}

/**
 * Format a role name for display — strip common prefixes like "AWS".
 */
function formatRoleName(roleName: string): string {
  return roleName
    .replace(/^AWS/, "")
    .replace(/Access$/, " Access")
    .trim();
}

/**
 * Parse the additionalRegions preference into a list of region codes.
 */
function getAdditionalRegions(): string[] {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.additionalRegions) return [];
  return prefs.additionalRegions
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

/**
 * Build the list of regions to show for a profile:
 * the profile's default region + any additional regions (deduplicated).
 */
function getRegionsForProfile(profile: SSOProfile): string[] {
  const additional = getAdditionalRegions();
  const defaultRegion = profile.region || "us-east-1";
  const all = [defaultRegion, ...additional];
  // Deduplicate while preserving order
  return [...new Set(all)];
}

interface RoleListProps {
  account: AccountGroup;
}

/**
 * Second-level list: shows all available roles for a single AWS account.
 * Each role is shown once per region (default + additional configured regions).
 */
export function RoleList({ account }: RoleListProps) {
  const regions = getRegionsForProfile(account.roles[0]!);
  const hasMultipleRegions = regions.length > 1;
  const [usageData, setUsageData] = useState<UsageData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsageCounts().then((data) => {
      setUsageData(data);
      setIsLoading(false);
    });
  }, []);

  const refreshUsage = useCallback(() => {
    loadUsageCounts().then(setUsageData);
  }, []);

  /**
   * Sort roles by usage count (descending) for a given region.
   */
  const sortedRoles = useCallback(
    (region: string) => {
      return [...account.roles].sort((a, b) => {
        const countA = getUsageCount(
          usageData,
          account.accountId,
          a.ssoRoleName,
          region,
        );
        const countB = getUsageCount(
          usageData,
          account.accountId,
          b.ssoRoleName,
          region,
        );
        return countB - countA;
      });
    },
    [account, usageData],
  );

  return (
    <List
      navigationTitle={account.displayName}
      searchBarPlaceholder={`Search roles for ${account.displayName}...`}
      isLoading={isLoading}
    >
      {regions.map((region) => (
        <List.Section
          key={region}
          title={hasMultipleRegions ? region : account.displayName}
          subtitle={
            hasMultipleRegions
              ? `${account.roles.length} roles`
              : `Account ${account.accountId} · ${account.roles.length} role${account.roles.length > 1 ? "s" : ""}`
          }
        >
          {sortedRoles(region).map((profile) => (
            <RoleListItem
              key={`${profile.profileName}-${region}`}
              profile={profile}
              region={region}
              isDefault={region === (profile.region || "us-east-1")}
              usageCount={getUsageCount(
                usageData,
                account.accountId,
                profile.ssoRoleName,
                region,
              )}
              onUsageTracked={refreshUsage}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface RoleListItemProps {
  profile: SSOProfile;
  region: string;
  isDefault: boolean;
  usageCount: number;
  onUsageTracked: () => void;
}

function RoleListItem({
  profile,
  region,
  isDefault,
  usageCount,
  onUsageTracked,
}: RoleListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  const { showUsageCount } = getPreferenceValues<Preferences>();
  if (showUsageCount && usageCount > 0) {
    accessories.push({
      tag: { value: `${usageCount}×`, color: Color.Purple },
      tooltip: `Opened ${usageCount} time${usageCount > 1 ? "s" : ""}`,
    });
  }

  accessories.push({
    tag: { value: region, color: isDefault ? Color.Blue : Color.Orange },
    tooltip: isDefault ? "Default region" : "Additional region",
  });

  if (isDefault) {
    accessories.push({ icon: Icon.Star, tooltip: "Default region" });
  }

  accessories.push({
    text: profile.profileName,
    icon: Icon.Terminal,
    tooltip: "Profile name",
  });

  const consoleUrl = isDefault
    ? getDirectConsoleUrl(profile)
    : getDirectConsoleUrlWithRegion(profile, region);

  const handleOpen = async (url: string, shouldTrack = true) => {
    try {
      await openUrl(url);
      if (shouldTrack) {
        await trackUsage(profile.ssoAccountId, profile.ssoRoleName, region);
        onUsageTracked();
      }
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open browser",
        message: String(e),
      });
    }
  };

  return (
    <List.Item
      title={formatRoleName(profile.ssoRoleName)}
      subtitle={profile.ssoRoleName}
      icon={{
        source: getRoleIcon(profile.ssoRoleName),
        tintColor: getRoleColor(profile.ssoRoleName),
      }}
      keywords={[profile.profileName, profile.ssoRoleName, region]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action
              title={`Open Console (${region})`}
              icon={Icon.Globe}
              onAction={() => handleOpen(consoleUrl)}
            />
            <Action
              title="Open Sso Portal"
              icon={Icon.Link}
              onAction={() => handleOpen(getSSOPortalUrl(profile), false)}
            />
          </ActionPanel.Section>
          <ActionPanel.Submenu
            title="Open in Region…"
            icon={Icon.Map}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          >
            {AWS_REGIONS.map((r) => (
              <Action
                key={r.value}
                title={`${r.label} (${r.value})`}
                icon={r.value === region ? Icon.CheckCircle : Icon.Circle}
                onAction={() =>
                  handleOpen(getDirectConsoleUrlWithRegion(profile, r.value))
                }
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Account Id"
              content={profile.ssoAccountId}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Profile Name"
              content={profile.profileName}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Export Command"
              content={getExportCommand(profile)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
            <Action.CopyToClipboard
              title="Copy Role Name"
              content={profile.ssoRoleName}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Login">
            <Action
              title="Sso Login in Browser"
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => handleOpen(profile.ssoStartUrl)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
