import { Action, ActionPanel, Cache, LaunchType, List, confirmAlert, launchCommand, showToast } from "@raycast/api";
import { LINKINIZE_DOMAIN, ORGANIZATIONS, TOKEN } from "./constants";
import { Organization } from "./interfaces";
import got from "got";
import { handleAPIErrors, logout } from "./support";
import axios, { AxiosResponse } from "axios";

const cache = new Cache();
export default function Command() {
  const cached = cache.get(ORGANIZATIONS);
  const token = cache.get(TOKEN);

  if (!token) {
    logout();
    return;
  }

  const organizations: Organization[] = cached ? JSON.parse(cached) : [];
  return (
    <List navigationTitle="Linkinize Workspaces" searchBarPlaceholder="Switch Workspace">
      {organizations.map((item: Organization) => (
        <List.Item
          key={item.id}
          title={item.name}
          actions={
            <ActionPanel>
              <Action title="Switch Organization" onAction={() => switchContext(item, token)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function switchContext(organization: Organization, token: string) {
  if (await confirmAlert({ title: `${organization.name}`, message: "Confirm Workspace Swtich?" })) {
    axios
      .put(
        `${LINKINIZE_DOMAIN}/api/organizations/${organization.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then(async function (response: AxiosResponse) {
        await showToast({ title: "Changing Workspace", message: `to ${organization.name} 🥑` });
        await launchCommand({ name: "synchronize", type: LaunchType.UserInitiated });
      })
      .catch((error) => handleAPIErrors(error));
  } else {
    console.log("User Canceled.");
  }
}
