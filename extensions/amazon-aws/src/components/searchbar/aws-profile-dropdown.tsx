import { Icon, List } from "@raycast/api";
import { useEffect } from "react";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { useCachedPromise, useCachedState, useExec } from "@raycast/utils";

interface Props {
  onProfileSelected?: VoidFunction;
}

export default function AWSProfileDropdown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>("aws_profile");
  const profileOptions = useProfileOptions();

  useEffect(() => {
    const isSelectedProfileInvalid =
      selectedProfile && !profileOptions.some((profile) => profile.name === selectedProfile);

    if (!selectedProfile || isSelectedProfileInvalid) {
      setSelectedProfile(profileOptions[0]?.name);
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
      process.env.AWS_REGION = profileOptions.find((profile) => profile.name === selectedProfile)?.region;
    }

    if (!vaultSessions?.includes(selectedProfile || "")) {
      delete process.env.AWS_VAULT;
    }

    onProfileSelected?.();
  }, [selectedProfile, isUsingAwsVault]);

  if (!profileOptions || profileOptions.length < 2) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select AWS Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profileOptions.map((profile) => (
        <List.Dropdown.Item
          key={profile.name}
          value={profile.name}
          title={profile.name}
          icon={
            isUsingAwsVault
              ? vaultSessions.some((session) => session === profile.name)
                ? Icon.LockUnlocked
                : Icon.LockDisabled
              : undefined
          }
        />
      ))}
    </List.Dropdown>
  );
}

const useVaultSessions = (): string[] | undefined => {
  const profileOptions = useProfileOptions();
  const { data: awsVaultSessions } = useExec("aws-vault", ["list"], {
    env: { PATH: "/opt/homebrew/bin" },
    onError: () => undefined,
  });

  const activeSessions = awsVaultSessions
    ?.split(/\r?\n/)
    .filter(isRowWithActiveSession)
    .map((line) => line.split(" ")[0]);

  const activeSessionsFromMasterProfile = profileOptions
    .filter((profile) => profile.source_profile && activeSessions?.includes(profile.source_profile))
    .map((profile) => profile.name);

  return activeSessions && [...activeSessions, ...activeSessionsFromMasterProfile];
};

const useAwsVault = ({ profile, onUpdate }: { profile?: string; onUpdate: VoidFunction }) => {
  const { revalidate } = useExec("aws-vault", ["exec", profile as string, "--json"], {
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

  useEffect(() => {
    delete process.env.AWS_VAULT;
    revalidate();
  }, [profile]);
};

type ProfileOption = {
  name: string;
  region?: string;
  source_profile?: string;
};

const useProfileOptions = (): ProfileOption[] => {
  const { data: configs = { configFile: {}, credentialsFile: {} } } = useCachedPromise(loadSharedConfigFiles);
  const { configFile, credentialsFile } = configs;

  const profileOptions =
    Object.keys(configFile).length > 0 ? Object.entries(configFile) : Object.entries(credentialsFile);

  return profileOptions.map(([name, config]) => {
    const includeProfile = configFile[name]?.include_profile;
    const region =
      configFile[name]?.region ||
      credentialsFile[name]?.region ||
      (includeProfile && configFile[includeProfile]?.region);

    return { ...config, region, name };
  });
};

const isRowWithActiveSession = (line: string) =>
  (line.includes("sts.AssumeRole:") && !line.includes("sts.AssumeRole:-")) ||
  (line.includes("sts.GetSessionToken:") && !line.includes("sts.GetSessionToken:-"));
