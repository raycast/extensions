import { Action, ActionPanel, List, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getMDMProfiles, setMDMProfile } from "./lib";

const ListItem = ({
  profile,
  activeProfile,
  onSwitchProfile,
}: {
  profile: string;
  activeProfile: string;
  onSwitchProfile: (profile: string) => void;
}) => {
  const accessories = [];
  if (profile === activeProfile) {
    accessories.push({ text: "Active" });
  }

  return (
    <List.Item
      key={profile}
      id={profile}
      title={profile}
      accessories={accessories}
      actions={
        <ActionPanel title="Actions">
          <Action onAction={() => onSwitchProfile(profile)} title="Switch" />
        </ActionPanel>
      }
    />
  );
};

export default () => {
  const [isLoading, setIsLoading] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>("");

  useEffect(() => {
    setIsLoading(true);
    getMDMProfiles()
      .then((res) => {
        setAvailableProfiles(res.available);
        setActiveProfile(res.active);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const onSwitchProfile = async (profile: string) => {
    const result = await setMDMProfile(profile);
    if (result) {
      await showHUD("Switched MDM Profile", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch MDM Profile",
      });
    }
  };

  if (!isLoading && availableProfiles.length === 0) {
    return (
      <List searchBarPlaceholder="Search Profiles" isLoading={isLoading}>
        <List.EmptyView title="No MDM Profiles found" />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search Profiles" isLoading={isLoading}>
      {availableProfiles.map((profile) => (
        <ListItem key={profile} profile={profile} activeProfile={activeProfile} onSwitchProfile={onSwitchProfile} />
      ))}
    </List>
  );
};
