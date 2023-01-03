import { List } from "@raycast/api";
import { useEffect } from "react";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { useCachedPromise, useCachedState } from "@raycast/utils";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

export default function AWSProfileDropdown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>("aws_profile");
  const { data: configs } = useCachedPromise(loadSharedConfigFiles);

  const { configFile, credentialsFile } = configs || {};

  const profileOptions = configFile ? Object.keys(configFile) : credentialsFile ? Object.keys(credentialsFile) : [];

  useEffect(() => {
    if (!selectedProfile && profileOptions) {
      setSelectedProfile(profileOptions[0]);
    }
  }, [profileOptions]);

  useEffect(() => {
    if (selectedProfile) {
      process.env.AWS_PROFILE = selectedProfile;
      process.env.AWS_REGION = configFile?.[selectedProfile]?.region || credentialsFile?.[selectedProfile]?.region;

      onProfileSelected?.(selectedProfile);
    }
  }, [selectedProfile, configs]);

  if (!profileOptions || profileOptions.length < 2) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select AWS Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profileOptions.map((profile) => (
        <List.Dropdown.Item key={profile} value={profile} title={profile} />
      ))}
    </List.Dropdown>
  );
}
