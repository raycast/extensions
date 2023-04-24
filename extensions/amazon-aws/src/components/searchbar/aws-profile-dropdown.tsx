import { Icon, List } from "@raycast/api";
import { useEffect } from "react";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { useCachedPromise, useCachedState, useExec } from "@raycast/utils";

interface Props {
  onProfileSelected?: VoidFunction;
}

export default function AWSProfileDropdown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>("aws_profile");
  const { data: configs = { configFile: {}, credentialsFile: {} } } = useCachedPromise(loadSharedConfigFiles);
  const { configFile, credentialsFile } = configs;

  const profileOptions = Object.keys(configFile).length > 0 ? Object.keys(configFile) : Object.keys(credentialsFile);

  useEffect(() => {
    const isSelectedProfileInvalid = selectedProfile && !profileOptions.includes(selectedProfile);

    if (!selectedProfile || isSelectedProfileInvalid) {
      setSelectedProfile(profileOptions[0]);
    }
  }, [profileOptions]);

  const vaultSessions = useVaultSessions();
  const isUsingAwsVault = !!vaultSessions;

  useAwsVault({
    profile: vaultSessions?.includes(selectedProfile || "") ? selectedProfile : undefined,
    onUpdate: () => onProfileSelected?.(),
  });

  useEffect(() => {
    if (selectedProfile && !isUsingAwsVault) {
      process.env.AWS_PROFILE = selectedProfile;
    } else {
      delete process.env.AWS_PROFILE;
    }

    if (selectedProfile) {
      const includeProfile = configFile?.[selectedProfile]?.include_profile;
      process.env.AWS_REGION =
        configFile?.[selectedProfile]?.region ||
        credentialsFile?.[selectedProfile]?.region ||
        (includeProfile && configFile?.[includeProfile]?.region);
    }

    if (!vaultSessions?.includes(selectedProfile || "")) {
      delete process.env.AWS_VAULT;
    }

    onProfileSelected?.();
  }, [selectedProfile, isUsingAwsVault, configs]);

  if (!profileOptions || profileOptions.length < 2) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select AWS Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profileOptions.map((profile) => (
        <List.Dropdown.Item
          key={profile}
          value={profile}
          title={profile}
          icon={isUsingAwsVault ? (vaultSessions.includes(profile) ? Icon.LockUnlocked : Icon.LockDisabled) : undefined}
        />
      ))}
    </List.Dropdown>
  );
}

const useVaultSessions = () => {
  const { data: awsVaultSessions } = useExec("aws-vault", ["list"], {
    env: { PATH: "/opt/homebrew/bin" },
    onError: () => undefined,
  });

  const activeSessions = awsVaultSessions
    ?.split(/\r?\n/)
    .filter((line) => line.includes("sts.AssumeRole:") && !line.includes("sts.AssumeRole:-"))
    .map((line) => line.split(" ")[0]);

  return activeSessions;
};

const useAwsVault = ({ profile, onUpdate }: { profile?: string; onUpdate: VoidFunction }) => {
  useExec("aws-vault", ["exec", profile as string, "--json"], {
    execute: !!profile,
    env: { PATH: "/opt/homebrew/bin" },
    onError: () => undefined,
    onData: (awsCredentials) => {
      if (awsCredentials) {
        const { AccessKeyId, SecretAccessKey, SessionToken } = JSON.parse(awsCredentials) as {
          AccessKeyId: string;
          SecretAccessKey: string;
          SessionToken: string;
        };
        process.env.AWS_VAULT = profile;
        process.env.AWS_ACCESS_KEY_ID = AccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY = SecretAccessKey;
        process.env.AWS_SESSION_TOKEN = SessionToken;

        onUpdate();
      }
    },
  });
};
