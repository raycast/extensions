import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ConfigurationProfile } from "@aws-sdk/client-appconfig";
import { useAppConfigProfiles, useAppConfigEnvironments } from "../../hooks/use-appconfig";
import { AppConfigFlags } from "./AppConfigFlags";

interface Props {
  applicationId: string;
  applicationName: string;
}

export function AppConfigProfiles({ applicationId, applicationName }: Props) {
  const { profiles, error, isLoading } = useAppConfigProfiles(applicationId);
  const { environments } = useAppConfigEnvironments(applicationId);

  // Use first environment as default (or could add env picker)
  const defaultEnvironment = environments?.[0];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${applicationName} - Configuration Profiles`}
      searchBarPlaceholder="Filter profiles by name..."
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      ) : profiles?.length === 0 ? (
        <List.EmptyView
          title="No feature flag profiles found"
          description="Only AWS.AppConfig.FeatureFlags profiles are shown"
          icon={{ source: Icon.AppWindowList, tintColor: Color.Orange }}
        />
      ) : (
        profiles?.map((profile) => (
          <ConfigurationProfileItem
            key={profile.Id}
            profile={profile}
            applicationId={applicationId}
            applicationName={applicationName}
            environmentId={defaultEnvironment?.Id}
            environmentName={defaultEnvironment?.Name}
          />
        ))
      )}
    </List>
  );
}

function ConfigurationProfileItem({
  profile,
  applicationId,
  applicationName,
  environmentId,
  environmentName,
}: {
  profile: ConfigurationProfile;
  applicationId: string;
  applicationName: string;
  environmentId?: string;
  environmentName?: string;
}) {
  const AWS_REGION = process.env.AWS_REGION;

  return (
    <List.Item
      key={profile.Id}
      title={profile.Name || "Unnamed Profile"}
      subtitle={profile.Description || ""}
      icon={{ source: Icon.Document, tintColor: Color.Purple }}
      actions={
        <ActionPanel>
          {environmentId ? (
            <Action.Push
              title="View Feature Flags"
              icon={Icon.List}
              target={
                <AppConfigFlags
                  applicationId={applicationId}
                  applicationName={applicationName}
                  configurationProfileId={profile.Id!}
                  configurationProfileName={profile.Name!}
                  environmentId={environmentId}
                  environmentName={environmentName || "Default"}
                />
              }
            />
          ) : (
            <Action title="No Environment Available" icon={Icon.Warning} />
          )}
          <Action.OpenInBrowser
            title="Open in AWS Console"
            url={`https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${applicationId}/configurationprofiles/${profile.Id}?region=${AWS_REGION}`}
          />
          <Action.CopyToClipboard title="Copy Profile ID" content={profile.Id || ""} />
        </ActionPanel>
      }
      accessories={[{ tag: { value: "Feature Flags", color: Color.Purple } }, { text: profile.Id }]}
    />
  );
}
