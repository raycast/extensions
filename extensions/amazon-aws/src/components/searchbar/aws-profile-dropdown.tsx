import { Icon, List, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";
import { loadSharedConfigFiles, loadSsoSessionData } from "@aws-sdk/shared-ini-file-loader";
import { useCachedPromise, useCachedState, useExec } from "@raycast/utils";

interface Preferences {
  useAWSVault: boolean;
}

interface AwsVaultProps {
  shouldUseAwsVault: boolean;
  selectedProfile: string | undefined;
  profileOptions: ProfileOption[];
  onProfileSelected?: () => void;
}

interface Props {
  onProfileSelected?: () => void;
}

export default function AWSProfileDropdown({ onProfileSelected }: Props) {
  const preferences = getPreferenceValues<Preferences>();

  const [selectedProfile, setSelectedProfile] = useCachedState<string>("aws_profile");

  const profileOptions = useProfileOptions();

  useEffect(() => {
    const isSelectedProfileInvalid =
      selectedProfile && !profileOptions.some((profile) => profile.name === selectedProfile);

    if (!selectedProfile || isSelectedProfileInvalid) {
      setSelectedProfile(profileOptions[0]?.name);
    }
  }, [profileOptions]);

  const { isUsingAwsVault, vaultSessions } = useAwsVault({
    shouldUseAwsVault: preferences.useAWSVault,
    selectedProfile: selectedProfile,
    profileOptions: profileOptions,
    onProfileSelected: onProfileSelected,
  });

  useEffect(() => {
    if (selectedProfile && !isUsingAwsVault) {
      process.env.AWS_PROFILE = selectedProfile;
    } else {
      delete process.env.AWS_PROFILE;
    }

    if (selectedProfile) {
      const profile = profileOptions.find((profile) => profile.name === selectedProfile);
      if (profile?.region) {
        process.env.AWS_REGION = profile.region;
      }
      if (profile?.sso_start_url) {
        process.env.AWS_SSO_START_URL = profile.sso_start_url;
      }
      if (profile?.sso_account_id) {
        process.env.AWS_SSO_ACCOUNT_ID = profile.sso_account_id;
      }
      if (profile?.sso_role_name) {
        process.env.AWS_SSO_ROLE_NAME = profile.sso_role_name;
      }
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
              ? vaultSessions?.some((session) => session === profile.name)
                ? Icon.LockUnlocked
                : Icon.LockDisabled
              : undefined
          }
        />
      ))}
    </List.Dropdown>
  );
}

const useVaultSessions = (profileOptions: ProfileOption[]): string[] | undefined => {
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

const useAwsVault = ({ shouldUseAwsVault, selectedProfile, profileOptions, onProfileSelected }: AwsVaultProps) => {
  if (!shouldUseAwsVault) {
    return { isUsingAwsVault: false, vaultSessions: undefined };
  }

  const vaultSessions = useVaultSessions(profileOptions);

  const isUsingAwsVault = !!vaultSessions;

  const profile = isUsingAwsVault && vaultSessions?.includes(selectedProfile || "") ? selectedProfile : undefined;

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

        onProfileSelected?.();
      }
    },
  });

  useEffect(() => {
    delete process.env.AWS_VAULT;
    revalidate();
  }, [profile]);

  return { isUsingAwsVault, vaultSessions };
};

export type ProfileOption = {
  name: string;
  region?: string;
  source_profile?: string;
  sso_start_url?: string;
  sso_account_id?: string;
  sso_role_name?: string;
  sso_session?: string;
};

const useProfileOptions = (): ProfileOption[] => {
  const { data: configs = { configFile: {}, credentialsFile: {} } } = useCachedPromise(loadSharedConfigFiles);
  const { data: ssoSessions = {} } = useCachedPromise(loadSsoSessionData);
  const { configFile, credentialsFile } = configs;

  const profileOptions =
    Object.keys(configFile).length > 0 ? Object.entries(configFile) : Object.entries(credentialsFile);

  return profileOptions.map(([name, config]) => {
    const includeProfile = configFile[name]?.include_profile;
    const region = configFile[name]?.region || (includeProfile && configFile[includeProfile]?.region);
    const sso_start_url =
      configFile[name]?.sso_start_url ||
      (configFile[name]?.sso_session && ssoSessions[configFile[name].sso_session!]?.sso_start_url);
    const sso_account_id =
      configFile[name]?.sso_account_id || (includeProfile && configFile[includeProfile]?.sso_account_id);
    const sso_role_name =
      configFile[name]?.sso_role_name || (includeProfile && configFile[includeProfile]?.sso_role_name);
    return { ...config, region, name, sso_start_url, sso_account_id, sso_role_name };
  });
};

const isRowWithActiveSession = (line: string) =>
  (line.includes("sts.AssumeRole:") && !line.includes("sts.AssumeRole:-")) ||
  (line.includes("sts.GetSessionToken:") && !line.includes("sts.GetSessionToken:-"));
