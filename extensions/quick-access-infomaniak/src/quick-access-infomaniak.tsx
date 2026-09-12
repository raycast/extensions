import { ActionPanel, Action, Icon, List, openExtensionPreferences } from "@raycast/api";
import API from "./api/api";
import { useEffect, useState } from "react";
import { Organization } from "./types/Organization";
import { InfomaniakResponse } from "./types/InfomaniakResponse";
import BrowseOrganizationProducts from "./browse/browse-organization-products";
import { AxiosError } from "axios";

function BrowseOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(200);

  useEffect(() => {
    API.get<InfomaniakResponse<Organization>>("/1/accounts")
      .then((response) => {
        const organizations = response?.data?.data ?? [];

        organizations.sort((a, b) => {
          if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
          if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;
          return 0;
        });

        setOrganizations(organizations);
      })
      .catch((error: unknown) => {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            setStatus(401);
          } else if (error.response?.status === 429) {
            setStatus(429);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (status === 401) {
    return (
      <List isLoading={loading}>
        <List.EmptyView
          icon={Icon.Key}
          title="Access token required"
          description="Please setup your access token in the settings."
          actions={
            <ActionPanel>
              <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (status === 429) {
    return (
      <List isLoading={loading}>
        <List.EmptyView
          icon={Icon.CircleDisabled}
          title="Too many requests"
          description="Please wait a little bit before retrying."
        />
      </List>
    );
  }

  return (
    <List isLoading={loading}>
      {organizations.map((organization) => (
        <List.Item
          key={organization.id}
          title={organization.name}
          subtitle={
            organization.legal_entity_type === "association"
              ? "Association"
              : organization.legal_entity_type === "individual"
                ? "Individual"
                : "Company"
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Organization"
                icon="domain.png"
                target={<BrowseOrganizationProducts organization={organization} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default BrowseOrganizations;
