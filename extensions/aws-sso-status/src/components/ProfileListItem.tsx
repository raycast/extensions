import Diagnostics from "../diagnostics";
import { ProjectAction } from "./ProjectAction";
import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { consoleUrl } from "../aws/profiles";
import { CredentialStatus, ProfileStatus } from "../aws/types";
import { displayDate, formatRemainingTime } from "../formatting";
export function statusIcon(status: CredentialStatus) {
  return {
    source: status === "Signed In" ? Icon.CheckCircle : status === "Checking" ? Icon.Clock : Icon.ExclamationMark,
    tintColor: status === "Signed In" ? Color.Green : status === "Expiring Soon" ? Color.Orange : Color.SecondaryText,
  };
}
export function loginLabel(item: ProfileStatus) {
  return ["Signed In", "Expiring Soon", "Expired"].includes(item.status) ? "Sign In Again" : "Sign In";
}
export function ProfileListItem({
  item,
  sharedProfiles,
  onSignIn,
  onRefresh,
  onRefreshAll,
}: {
  item: ProfileStatus;
  sharedProfiles: string[];
  onSignIn: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onRefreshAll: () => Promise<void>;
}) {
  const profile = item.profile;
  const portal = consoleUrl(profile);
  const fields = [
    ["Status", item.status],
    ["Account ID", profile.accountId],
    ["Role", profile.roleName],
    ["Region", profile.region],
    ["SSO Region", profile.ssoRegion],
    ["SSO Session", profile.sessionName || "Legacy"],
    ["Credential Expiration", displayDate(item.expiration)],
    ["Remaining Time", formatRemainingTime(item.expiration)],
    ["Shared Profiles", sharedProfiles.join(", ")],
    ["Last Successful Check", displayDate(item.lastSuccessAt)],
    ["Data Freshness", item.stale ? "Stale — showing the last known result" : "Current"],
    ["Last Checked", displayDate(item.checkedAt)],
  ];
  return (
    <List.Item
      title={profile.name}
      icon={statusIcon(item.status)}
      accessories={[{ text: item.status }]}
      detail={
        <List.Item.Detail
          markdown={
            item.message ||
            "Remaining time is the resolved AWS credential lifetime. AWS CLI may refresh credentials automatically while your Identity Center session remains valid."
          }
          metadata={
            <List.Item.Detail.Metadata>
              {fields.map(([title, value]) => (
                <List.Item.Detail.Metadata.Label key={title} title={title!} text={value || "Not configured"} />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {!profile.issues.length && <Action title={loginLabel(item)} icon={Icon.Key} onAction={onSignIn} />}
          <Action
            title={"Refresh Status"}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <Action title={"Refresh All Profiles"} icon={Icon.ArrowClockwise} onAction={onRefreshAll} />
          {portal && <Action.OpenInBrowser title={"Open AWS Console"} url={portal} />}
          <Action.CopyToClipboard title={"Copy Profile Name"} content={profile.name} />
          {profile.accountId && <Action.CopyToClipboard title={"Copy Account ID"} content={profile.accountId} />}
          <Action title={"Open Extension Preferences"} icon={Icon.Gear} onAction={openExtensionPreferences} />
          <ActionPanel.Section>
            <Action.Push title={"Diagnostics"} icon={Icon.WrenchScrewdriver} target={<Diagnostics />} />
            <ProjectAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
