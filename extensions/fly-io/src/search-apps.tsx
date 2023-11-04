import { ActionPanel, Detail, List, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { OrganizationConnection, fetchOrganizations, flyioBaseUrl } from "./flyio";

export interface Preferences {
  flyioApiKey?: string;
}

export default function Command() {
  const [organizations, setOrganizations] = useState<OrganizationConnection>();
  useEffect(() => {
    getOrgs();
  }, []);

  async function getOrgs() {
    const preferences: Preferences = getPreferenceValues();
    const organizations = await fetchOrganizations(preferences.flyioApiKey ?? "");
    if (organizations) {
      setOrganizations(organizations);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "something went wrong",
        message: "Please check your api key is correct",
      });
    }
  }

  return (
    <List>
      {organizations?.edges?.map((edge) => {
        return (
          <List.Section key={edge?.node?.id} title={edge?.node?.name}>
            {edge?.node?.apps?.edges?.map((app) => {
              return (
                <List.Item
                  key={app?.node?.id}
                  title={app?.node?.name}
                  subtitle={app?.node?.hostname}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Go Overview" url={`${flyioBaseUrl}/${app?.node?.name}`} />
                      <Action.OpenInBrowser title="Open App" url={`https://${app?.node?.hostname}`} />
                      <Action.CopyToClipboard
                        title="Copy Hostname"
                        content={app?.node?.hostname}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.OpenInBrowser title="Go Machines" url={`${flyioBaseUrl}/${app?.node?.name}/machines`} />
                      <Action.OpenInBrowser title="Go Volumes" url={`${flyioBaseUrl}/${app?.node?.name}/volumes`} />
                      <ActionPanel.Section>
                        <Action.OpenInBrowser title="Go Activity" url={`${flyioBaseUrl}/${app?.node?.name}/activity`} />
                        <Action.OpenInBrowser title="Go Metrics" url={`${flyioBaseUrl}/${app?.node?.name}/metrics`} />
                        <Action.OpenInBrowser
                          title="Go Monitoring"
                          url={`${flyioBaseUrl}/${app?.node?.name}/monitoring`}
                        />
                        <Action.OpenInBrowser
                          title="Go Sentry_new"
                          url={`${flyioBaseUrl}/${app?.node?.name}/sentry_new`}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          title="Go Certificates"
                          url={`${flyioBaseUrl}/${app?.node?.name}/certificates`}
                        />
                        <Action.OpenInBrowser title="Go Secrets" url={`${flyioBaseUrl}/${app?.node?.name}/secrets`} />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser title="Go Tokens" url={`${flyioBaseUrl}/${app?.node?.name}/secrets`} />
                        <Action.OpenInBrowser title="Go Settings" url={`${flyioBaseUrl}/${app?.node?.name}/tokens`} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
