import { useEffect, useState } from "react";
import {
  Detail,
  Toast,
  showToast,
  openExtensionPreferences,
  ActionPanel,
  Action,
  List,
  showHUD,
  launchCommand,
  LaunchType,
  Icon,
} from "@raycast/api";
import { BusinessProfile, PersonalProfile, fetchProfiles } from "./api/profile";
import { wiseReadApiToken } from "./helpers/preferences";
import { getAccountName } from "./helpers/getAccountName";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [profiles, setProfiles] = useCachedState<(PersonalProfile | BusinessProfile)[]>("profiles");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function getProfiles() {
      try {
        setIsLoading(true);
        const response = await fetchProfiles();
        setProfiles(response);
      } catch (error) {
        await showToast({ title: "Error", message: "Failed to fetch profiles", style: Toast.Style.Failure });
      } finally {
        setIsLoading(false);
      }
    }
    if (wiseReadApiToken) getProfiles();
  }, []);

  if (!wiseReadApiToken) {
    const markdown = "API key Missing. Please update it in extension preferences and try again.";
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {profiles?.map((profile) => (
        <List.Item
          key={profile.id}
          title={getAccountName(profile)}
          subtitle={profile.id.toString()}
          accessories={[{ text: profile.type === "PERSONAL" ? `👤 ${profile.type}` : `💼 ${profile.type}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Profile ID"
                content={profile.id}
                onCopy={async () => await showHUD("Copied")}
              />
              <Action.CopyToClipboard
                title="Copy Profile ID and Open Preference"
                content={profile.id}
                onCopy={openExtensionPreferences}
              />
              <Action
                title="Fetch Balances"
                icon={Icon.Wallet}
                onAction={() =>
                  launchCommand({
                    name: "get-balances",
                    type: LaunchType.UserInitiated,
                    arguments: { profileId: profile.id.toString() },
                  })
                }
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action
                title="Fetch Transactions"
                icon={Icon.Receipt}
                onAction={() =>
                  launchCommand({
                    name: "get-transactions",
                    type: LaunchType.UserInitiated,
                    arguments: { profileId: profile.id.toString() },
                  })
                }
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {profiles?.length === 0 && <List.EmptyView title="No profiles found" />}
    </List>
  );
}
