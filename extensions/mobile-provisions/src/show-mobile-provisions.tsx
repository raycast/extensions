import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ProvisioningProfile } from "./types";
import { parseProvisioningProfile } from "./utils/parser";
import { useState } from "react";
import { getProfileTypeColor } from "./utils/helpers";
import { getMarkdown, DetailMetadata, ProfileActions } from "./components/ProvisionProfileDetails";

const PROFILES_PATH = path.join(os.homedir(), "Library/MobileDevice/Provisioning Profiles");

async function getProvisioningProfiles(): Promise<ProvisioningProfile[]> {
  try {
    const files = await fs.readdir(PROFILES_PATH);

    const filesWithStats = await Promise.all(
      files
        .filter((file) => file.endsWith(".mobileprovision"))
        .map(async (file) => {
          const filePath = path.join(PROFILES_PATH, file);
          const stat = await fs.stat(filePath);
          return { file, mtime: stat.mtime };
        }),
    );

    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const profilePromises = filesWithStats.map(async ({ file }) => {
      try {
        return await parseProvisioningProfile(path.join(PROFILES_PATH, file));
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error);
        return null;
      }
    });
    const results = await Promise.all(profilePromises);
    return results.filter((p): p is ProvisioningProfile => p !== null);
  } catch (error) {
    console.error("Failed to read provisioning profiles directory:", error);
    return [];
  }
}

function ProfileListItem({
  profile,
  isShowingDetail,
  onToggleDetails,
  globalActions,
}: {
  profile: ProvisioningProfile;
  isShowingDetail: boolean;
  onToggleDetails: () => void;
  globalActions?: React.ReactNode;
}) {
  const accessories: List.Item.Accessory[] = isShowingDetail
    ? []
    : [
        { tag: { value: profile.Platform.join(", "), color: Color.SecondaryText } },
        { tag: { value: profile.Type, color: getProfileTypeColor(profile.Type) } },
        ...(profile.ExpirationDate < new Date() ? [{ tag: { value: "Expired", color: Color.Red } }] : []),
      ];

  const keywords = [
    ...(profile.ProvisionedDevices ?? []),
    profile.TeamName,
    profile.Type,
    ...profile.Platform,
    profile.AppIDName,
    profile.ApplicationIdentifierPrefix[0],
    profile.UUID,
  ];

  return (
    <List.Item
      key={profile.UUID}
      title={profile.Name}
      subtitle={profile.TeamName}
      accessories={accessories}
      keywords={keywords}
      quickLook={{ path: profile.filePath }}
      detail={<List.Item.Detail markdown={getMarkdown(profile)} metadata={<DetailMetadata profile={profile} />} />}
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.AppWindowSidebarLeft}
            onAction={onToggleDetails}
          />
          <ProfileActions profile={profile} />
          {globalActions}
        </ActionPanel>
      }
    />
  );
}

export default function ShowMobileProvisions() {
  const { data: profiles, isLoading } = usePromise(getProvisioningProfiles, []);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const expiredProfiles = profiles?.filter((p) => p.ExpirationDate < new Date()) ?? [];

  function RemoveAllExpiredProvisionsAction() {
    if (expiredProfiles.length === 0) return null;
    return (
      <ActionPanel.Section>
        <Action.Trash
          title="Remove All Expired Provisions"
          paths={expiredProfiles.map((p) => p.filePath)}
          shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
        />
      </ActionPanel.Section>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {profiles?.map((profile) => (
        <ProfileListItem
          key={profile.UUID}
          profile={profile}
          isShowingDetail={isShowingDetail}
          onToggleDetails={() => setIsShowingDetail((v) => !v)}
          globalActions={<RemoveAllExpiredProvisionsAction />}
        />
      ))}
    </List>
  );
}
