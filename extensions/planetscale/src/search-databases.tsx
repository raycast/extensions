import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { PlanetScaleColor } from "./lib/colors";
import { format } from "date-fns";
import { View } from "./lib/oauth/view";
import { useOrganizations } from "./lib/hooks/use-organizations";
import { useDatabases } from "./lib/hooks/use-databases";
import { getDatabaseIcon } from "./lib/icons";

function ListSection({ organization }: { organization: string }) {
  const { databases } = useDatabases({ organization });
  return (
    <List.Section title={organization}>
      {databases.map((database) => (
        <List.Item
          key={database.id}
          title={database.name}
          icon={getDatabaseIcon(database)}
          accessories={[
            {
              icon: {
                source: "table.svg",
                tintColor: PlanetScaleColor.Blue,
              },
              text: database.default_branch_table_count.toString(),
              tooltip: "Tables",
            },
            {
              icon: {
                source: "branch.svg",
                tintColor: PlanetScaleColor.Blue,
              },
              text: database.branches_count.toString(),
              tooltip: "Branches",
            },
            {
              tag: database.region.slug,
            },
            {
              tooltip: `Updated: ${format(new Date(database.updated_at), "EEEE d MMMM yyyy 'at' HH:mm")}`,
              date: new Date(database.updated_at),
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={database.html_url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy ID" content={database.id} />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={database.name}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={database.html_url}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <ActionPanel.Submenu icon={Icon.CopyClipboard} title="Copy Region Public IP">
                  {database.region.public_ip_addresses.map((ip) => (
                    <Action.CopyToClipboard key={ip} title={ip} content={ip} concealed />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function SearchDatabases() {
  const { organizations, organizationsLoading } = useOrganizations();
  return (
    <List isLoading={organizationsLoading} searchBarPlaceholder="Search databases">
      {organizations.map((organization) => (
        <ListSection key={organization.id} organization={organization.name} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchDatabases />
    </View>
  );
}
