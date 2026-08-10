import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { List, Icon, ActionPanel, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

export default function RunProfileScript() {
  const { data: configs = { configFile: {} }, isLoading, error } = useCachedPromise(loadSharedConfigFiles);
  const { configFile } = configs;

  const profileOptions = Object.entries(configFile)
    .map(([name, profile]) => ({ ...profile, name }) as Record<string, string>)
    .map((profile, _, self) => {
      const profileToExtend = profile.source_profile ?? profile.include_profile;
      const sourceProfile = profileToExtend ? self.find((p) => p.name === profileToExtend) : undefined;

      return { ...sourceProfile, ...profile };
    });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter profiles...">
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        profileOptions?.map((profile, index) => <Profile key={index} profile={profile} />)
      )}
    </List>
  );
}

function Profile({ profile }: { profile: Record<string, string | undefined> }) {
  return (
    <List.Item
      title={`${profile.sso_account_name ?? profile.name ?? ""}${
        profile.sso_account_id ? ` (${profile.sso_account_id})` : ""
      }`}
      accessories={[{ text: profile.sso_role_name }, { text: profile.region ?? profile.sso_region }]}
      icon="script-command.png"
      actions={
        <ActionPanel>
          <Action
            title="Run Script"
            onAction={async () => {
              const { script } = getPreferenceValues<Preferences.RunProfileScript>();
              const regex = /<profile>/i;

              if (script) {
                const scriptToExecute = script.replace(regex, profile.name || "");
                await promisify(exec)(scriptToExecute);

                showToast(Toast.Style.Success, "Script executed successfully");
              } else {
                showToast(Toast.Style.Failure, "No script defined in command preferences");
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
