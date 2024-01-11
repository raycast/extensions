import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, Keyboard, List } from "@raycast/api";
import { format } from "date-fns";
import { useBranches, useDatabases, useSelectedDatabase, useSelectedOrganization } from "./utils/hooks";
import { CreateDeployRequest } from "./create-deploy-request";
import { ListDatabaseDropdown, View } from "./utils/components";
import { PlanetScaleColor } from "./utils/colors";
import ActionStyle = Alert.ActionStyle;
import { CreateBranch } from "./create-branch";

function SearchBranches() {
  const [organization, setOrganization] = useSelectedOrganization();
  const [database, setDatabase] = useSelectedDatabase();
  const { databases } = useDatabases({ organization });
  const { branches, deleteBranch, branchesLoading } = useBranches({ organization, database });

  const selectedDatabase = databases?.find((db) => db.name === database);
  const databaseSleeping = selectedDatabase?.state === "sleeping";

  return (
    <List
      isLoading={branchesLoading}
      searchBarPlaceholder="Search branches"
      throttle
      searchBarAccessory={
        <ListDatabaseDropdown
          onChange={(value) => {
            setOrganization(value.organization);
            setDatabase(value.database);
          }}
        />
      }
    >
      {branches?.map((branch) => (
        <List.Item
          key={branch.id}
          title={branch.name}
          icon={
            (branch as any).state === "sleeping"
              ? {
                  source: "branch-sleep.svg",
                  tintColor: Color.SecondaryText,
                }
              : {
                  source: "branch.svg",
                  tintColor: PlanetScaleColor.Blue,
                }
          }
          accessories={[
            branch.production
              ? {
                  tag: {
                    value: "Production",
                    color: Color.Green,
                  },
                }
              : {},
            {
              tooltip: `Updated: ${format(new Date(branch.updated_at), "EEEE d MMMM yyyy 'at' HH:mm")}`,
              date: new Date(branch.updated_at),
            },
            branch.actor
              ? {
                  tooltip: branch.actor.display_name,
                  icon: {
                    source: branch.actor.avatar_url,
                    mask: Image.Mask.Circle,
                  },
                }
              : {},
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={branch.html_url} />
                {database && organization && branch && !databaseSleeping && !branch.production ? (
                  <Action.Push
                    icon={{
                      source: "deploy-open.svg",
                      tintColor: Color.PrimaryText,
                    }}
                    title="Create Deploy Request"
                    target={
                      <CreateDeployRequest organization={organization} database={database} branch={branch.name} />
                    }
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                {database && organization ? (
                  <Action.Push
                    icon={{
                      source: "branch.svg",
                      tintColor: Color.PrimaryText,
                    }}
                    title="Create Branch"
                    target={<CreateBranch organization={organization} database={database} branch={branch.name} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                ) : null}
                {!branch.production && !databaseSleeping ? (
                  <Action
                    title="Delete Branch"
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        primaryAction: {
                          title: "Confirm",
                          style: ActionStyle.Destructive,
                        },
                        icon: Icon.Trash,
                        title: "Delete Branch",
                        message: `Are you sure you want to delete branch ${branch.name}?`,
                      });

                      if (confirmed) {
                        await deleteBranch(branch.name);
                      }
                    }}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={branch.name}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={branch.html_url}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                {branch.access_host_url && (
                  <Action.CopyToClipboard title="Copy Access Host URL" content={branch.access_host_url} />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchBranches />
    </View>
  );
}
