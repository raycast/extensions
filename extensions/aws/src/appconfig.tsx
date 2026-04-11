import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Application } from "@aws-sdk/client-appconfig";
import { useAppConfigApps } from "./hooks/use-appconfig";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { AppConfigProfiles } from "./components/appconfig/AppConfigProfiles";

export default function AppConfig() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa } = useMfaGuard();
  const { apps, error, isLoading, revalidate } = useAppConfigApps();

  if (mfaLoading) {
    return <List isLoading={true} />;
  }

  if (needsMfa) {
    return (
      <MfaPrompt
        roleId={activeRole}
        onSuccess={() => {
          revalidateMfa();
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter applications by name..."
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      ) : apps?.length === 0 ? (
        <List.EmptyView
          title="No AppConfig applications found"
          icon={{ source: Icon.AppWindowList, tintColor: Color.Orange }}
        />
      ) : (
        apps?.map((app) => <AppConfigApp key={app.Id} app={app} />)
      )}
    </List>
  );
}

function AppConfigApp({ app }: { app: Application }) {
  const AWS_REGION = process.env.AWS_REGION;

  return (
    <List.Item
      key={app.Id}
      title={app.Name || "Unnamed Application"}
      subtitle={app.Description || ""}
      icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Configuration Profiles"
            icon={Icon.List}
            target={<AppConfigProfiles applicationId={app.Id!} applicationName={app.Name!} />}
          />
          <Action.OpenInBrowser
            title="Open in AWS Console"
            url={`https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${app.Id}?region=${AWS_REGION}`}
          />
          <Action.CopyToClipboard title="Copy Application ID" content={app.Id || ""} />
        </ActionPanel>
      }
      accessories={[{ text: app.Id }]}
    />
  );
}
