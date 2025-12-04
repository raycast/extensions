import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { format } from "date-fns";
import { CreateDeployRequest } from "./create-deploy-request";
import { CreateBranch } from "./create-branch";
import { View } from "./lib/oauth/view";
import { ListDatabaseDropdown } from "./lib/components/list-database-dropdown";
import { useBranches } from "./lib/hooks/use-branches";
import { useSelectedOrganization } from "./lib/hooks/use-selected-organization";
import { useSelectedDatabase } from "./lib/hooks/use-selected-database";
import { getBranchIcon, getUserIcon } from "./lib/icons";

function SearchBranches() {
  const [organization, setOrganization] = useSelectedOrganization();
  const [database, setDatabase] = useSelectedDatabase();
  const { branches, refreshBranches, deleteBranch, branchesLoading } = useBranches({ organization, database });

  return (
    <List
      isLoading={branchesLoading}
      searchBarPlaceholder="Search branches"
      searchBarAccessory={
        <ListDatabaseDropdown
          onChange={(value) => {
            setOrganization(value.organization);
            setDatabase(value.database);
          }}
        />
      }
    >
      {branches.map((branch) => (
        <List.Item
          key={branch.id}
          title={branch.name}
          icon={getBranchIcon(branch)}
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
                  icon: getUserIcon(branch.actor),
                }
              : {},
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={branch.html_url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {database && organization && branch && !branch.production ? (
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
                {!branch.production ? (
                  <Action
                    title="Delete Branch"
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        primaryAction: {
                          title: "Confirm",
                          style: Alert.ActionStyle.Destructive,
                        },
                        icon: {
                          source: Icon.Trash,
                          tintColor: Color.Red,
                        },
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
                {branch.region ? (
                  <ActionPanel.Submenu icon={Icon.CopyClipboard} title="Copy Region Public IP">
                    {branch.region.public_ip_addresses.map((ip) => (
                      <Action.CopyToClipboard key={ip} title={ip} content={ip} concealed />
                    ))}
                  </ActionPanel.Submenu>
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  icon={Icon.ArrowClockwise}
                  onAction={refreshBranches}
                />
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
