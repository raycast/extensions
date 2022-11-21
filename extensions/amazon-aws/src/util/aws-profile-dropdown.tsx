import AWS from "aws-sdk";
import { List } from "@raycast/api";
import { useEffect } from "react";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { useCachedPromise, useCachedState } from "@raycast/utils";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

export default function AWSProfileDropdown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>("aws_profile");

  const { data: profileOptions } = useCachedPromise(fetchProfileOptions);

  useEffect(() => {
    if (!selectedProfile && profileOptions) {
      setSelectedProfile(profileOptions[0]);
    }
  }, [profileOptions]);

  useEffect(() => {
    if (selectedProfile) {
      AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: selectedProfile });
      onProfileSelected?.(selectedProfile);
    }
  }, [selectedProfile]);

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

async function fetchProfileOptions() {
  return loadSharedConfigFiles().then((profiles) => Object.keys(profiles.credentialsFile));
}
