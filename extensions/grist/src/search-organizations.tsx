import { ActionPanel, Action, Icon, List, Detail, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { buildGristUrl, grist } from "./grist";
import Workspaces from "./workspaces";

export default function Command() {
  return !buildGristUrl("") ? (
    <Detail
      markdown={`# ERROR \n\n Invalid Grist URL`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <Organizations />
  );
}

function Organizations() {
  const { isLoading, data: organizations } = useCachedPromise(
    async () => {
      const res = await grist.listOrgs();
      return res;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {organizations.map((organization) => (
        <List.Item
          key={organization.id}
          icon={Icon.Building}
          title={organization.name}
          accessories={[{ tag: organization.access }, { date: new Date(organization.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.AppWindow}
                title="Workspaces"
                target={<Workspaces organization={organization} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
