import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchProps,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CometProfileInfo, getProfiles, getUserDataDir, ProfileLaunchContext, profileDeeplink } from "./profiles";
import { openProfile } from "./profile-launch";
import { useCometInstallation } from "./hooks/useCometInstallation";
import { NotInstalledError } from "./components";
import { join } from "node:path";

function profileIcon(profile: CometProfileInfo): Image.ImageLike {
  if (profile.avatarPath) return { source: profile.avatarPath, mask: Image.Mask.Circle };
  return { source: Icon.PersonCircle, tintColor: profile.color ?? Color.PrimaryText };
}

export default function Command(props: LaunchProps<{ launchContext?: ProfileLaunchContext }>) {
  // getProfiles() is synchronous and cached, so the list renders fully on first paint.
  const [profiles, setProfiles] = useState<CometProfileInfo[]>(getProfiles);
  const refresh = useCallback(() => setProfiles(getProfiles()), []);
  const { isChecking, isInstalled } = useCometInstallation();
  const installed = isInstalled === true;

  // Launched via deeplink with a profile in the context: open it right away instead of showing the list.
  const wanted = props.launchContext?.profile;
  const direct = wanted && installed ? profiles.find((p) => p.directory === wanted) : undefined;
  useEffect(() => {
    if (direct) openProfile(direct, {}, profiles.length);
  }, [direct]);
  if (direct) return <List isLoading />;

  if (isChecking) return <List isLoading />;
  if (!installed) return <NotInstalledError />;

  return (
    <List searchBarPlaceholder="Search Comet profiles…">
      <List.EmptyView
        icon={Icon.Person}
        title="No profiles found"
        description={`Nothing readable in ${getUserDataDir()}. Open Comet once, or check the Profile Path preference.`}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {profiles.map((profile) => {
        const accessories: List.Item.Accessory[] = [];
        if (profile.active)
          accessories.push({ icon: { source: Icon.Dot, tintColor: Color.Green }, tooltip: "Window open" });
        if (profile.lastUsed) accessories.push({ tag: "Last used" });
        return (
          <List.Item
            key={profile.directory}
            id={profile.directory}
            icon={profileIcon(profile)}
            title={profile.name}
            subtitle={profile.directory}
            keywords={[profile.directory]}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Open Profile" icon={Icon.Globe} onAction={() => openProfile(profile)} />
                  <Action
                    title="Open in New Window"
                    icon={Icon.NewDocument}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => openProfile(profile, { newWindow: true })}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Alias & Hotkey">
                  <Action
                    title="Set Alias or Hotkey in Raycast Settings"
                    icon={Icon.Keyboard}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={openExtensionPreferences}
                  />
                  <Action.CopyToClipboard
                    title="Copy Deeplink"
                    content={profileDeeplink(profile)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Reveal Profile Folder in Finder"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => open(join(getUserDataDir(), profile.directory), "com.apple.finder")}
                  />
                  <Action
                    title="Refresh Profiles"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
