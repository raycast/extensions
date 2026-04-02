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
import type { AccountGroup } from "../lib/types";
import {
  getDirectConsoleUrl,
  getDirectConsoleUrlWithRegion,
  AWS_REGIONS,
} from "../lib/url-builder";
import { openUrl } from "../lib/browser";
import { RoleList } from "./RoleList";
import { trackUsage } from "../lib/usage-tracker";

/**
 * Map stage names to colors.
 */
function getStageColor(stage: string): Color {
  const lower = stage.toLowerCase();
  if (lower.includes("prod") && !lower.includes("pre")) return Color.Red;
  if (lower.includes("pre-prod")) return Color.Orange;
  if (lower.includes("stag")) return Color.Yellow;
  if (lower.includes("uat") || lower.includes("qa") || lower.includes("test"))
    return Color.Orange;
  if (lower.includes("dev") || lower.includes("sandbox")) return Color.Green;
  if (lower.includes("security") || lower.includes("audit"))
    return Color.Purple;
  return Color.SecondaryText;
}

/**
 * Get an icon for the stage.
 */
function getStageIcon(stage: string): Icon {
  const lower = stage.toLowerCase();
  if (lower.includes("prod")) return Icon.ExclamationMark;
  if (lower.includes("stag") || lower.includes("uat") || lower.includes("qa"))
    return Icon.Eye;
  if (lower.includes("dev") || lower.includes("sandbox")) return Icon.Code;
  if (lower.includes("security") || lower.includes("audit")) return Icon.Shield;
  return Icon.Circle;
}

export interface AccountListItemProps {
  account: AccountGroup;
  isSelected: boolean;
  selectionCount: number;
  usageCount: number;
  onToggleSelect: (accountId: string) => void;
  onOpenSelected: () => Promise<void>;
  onClearSelection: () => void;
  onUsageTracked: () => void;
}

export function AccountListItem({
  account,
  isSelected,
  selectionCount,
  usageCount,
  onToggleSelect,
  onOpenSelected,
  onClearSelection,
  onUsageTracked,
}: AccountListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  // Show selection indicator when in multi-select mode
  if (isSelected) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: "Selected for multi-session",
    });
  }

  // Show usage count (only if preference enabled)
  const { showUsageCount } = getPreferenceValues<{
    showUsageCount?: boolean;
  }>();
  if (showUsageCount && usageCount > 0) {
    accessories.push({
      tag: { value: `${usageCount}×`, color: Color.Purple },
      tooltip: `Opened ${usageCount} time${usageCount > 1 ? "s" : ""} total`,
    });
  }

  // Show stage
  if (account.stage) {
    accessories.push({
      tag: { value: account.stage, color: getStageColor(account.stage) },
      tooltip: "Stage",
    });
  }

  // Show role count
  const roleNames = account.roles.map((r) => r.ssoRoleName).join(", ");
  accessories.push({
    text: `${account.roles.length} role${account.roles.length > 1 ? "s" : ""}`,
    icon: Icon.Person,
    tooltip: roleNames,
  });

  const defaultProfile = account.roles[0]!;

  const handleOpen = async (url: string, shouldTrack = false) => {
    try {
      openUrl(url);
      if (shouldTrack) {
        await trackUsage(
          defaultProfile.ssoAccountId,
          defaultProfile.ssoRoleName,
          defaultProfile.region || "us-east-1",
        );
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
      key={account.accountId}
      title={account.displayName}
      subtitle={account.accountId}
      icon={
        account.stage
          ? {
              source: getStageIcon(account.stage),
              tintColor: getStageColor(account.stage),
            }
          : Icon.Globe
      }
      keywords={[
        account.accountId,
        account.accountAlias || "",
        account.stage || "",
        ...account.roles.map((r) => r.ssoRoleName),
      ]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigate">
            <Action.Push
              title="Show Roles"
              icon={Icon.List}
              target={<RoleList account={account} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Open">
            <Action
              title={`Open Console (${defaultProfile.ssoRoleName})`}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() =>
                handleOpen(getDirectConsoleUrl(defaultProfile), true)
              }
            />
            <ActionPanel.Submenu
              title="Open in Region…"
              icon={Icon.Map}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            >
              {AWS_REGIONS.map((r) => (
                <Action
                  key={r.value}
                  title={`${r.label} (${r.value})`}
                  icon={
                    r.value === defaultProfile.region
                      ? Icon.CheckCircle
                      : Icon.Circle
                  }
                  onAction={() =>
                    handleOpen(
                      getDirectConsoleUrlWithRegion(defaultProfile, r.value),
                    )
                  }
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section title="Multi-Session (up to 5)">
            <Action
              title={
                isSelected
                  ? "Deselect for Multi-session"
                  : "Select for Multi-session"
              }
              icon={isSelected ? Icon.CircleDisabled : Icon.PlusCircle}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => onToggleSelect(account.accountId)}
            />
            {selectionCount > 0 && (
              <Action
                title={`Open ${selectionCount} Selected Session${selectionCount > 1 ? "s" : ""}`}
                icon={Icon.AppWindowGrid2x2}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={onOpenSelected}
              />
            )}
            {selectionCount > 0 && (
              <Action
                title="Clear Selection"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                onAction={onClearSelection}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Account Id"
              content={account.accountId}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Login">
            <Action
              title="Sso Login in Browser"
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => handleOpen(account.ssoStartUrl)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
