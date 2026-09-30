import { ActionPanel, Color, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

export default function SwitchProfile({
  xKey,
  port,
  allProfiles,
  currentProfile,
}: {
  xKey: string;
  port: string;
  allProfiles: string[];
  currentProfile: string;
}) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green };
  const iconTransparent = { source: "Transparent.png" };

  async function handleAction(profileName: string) {
    try {
      await api(xKey, port).changeProfile(profileName);
      await showToast(Toast.Style.Success, "Success", `Profile has been changed to "${profileName}".`);
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed",
        message: "Please check your X-Key, port and function availability",
      });
    }
  }

  return (
    <List.Item
      title="Switch Profile"
      subtitle={currentProfile}
      icon={Icon.ArrowRight}
      actions={
        <ActionPanel title="Switch Profile">
          <ActionPanel.Submenu title="Switch Profile">
            {allProfiles.map((profile) => (
              <ActionPanel.Item
                key={profile}
                title={profile}
                icon={profile === currentProfile ? iconCheckMark : iconTransparent}
                onAction={() => handleAction(profile)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
