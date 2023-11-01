import { Action, ActionPanel, Color, Keyboard, List } from "@raycast/api";
import { getAvatarIcon, useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { format } from "date-fns";
import { useBranches, useDatabases, useOrganizations } from "./utils/hooks";
import CreateDeployRequest from "./create-deploy-request";
import { DatabaseDropdown } from "./utils/components";

export default function SearchBranches() {
  const [organization, setOrganization] = useCachedState<string>("organization");
  const [database, setDatabase] = useCachedState<string>("database");
  const { organizations, organizationsLoading } = useOrganizations();
  const { databases, databasesLoading } = useDatabases({ organization });
  const { branches, branchesLoading } = useBranches({ organization, database });

  const isLoading = branchesLoading || organizationsLoading || databasesLoading;

  useEffect(() => {
    const defaultOrganization = organizations?.[0]?.name;
    if (!isLoading && !organization && defaultOrganization) {
      setOrganization(defaultOrganization);
    }
  }, [isLoading, organization, organizations]);

  useEffect(() => {
    const defaultDatabase = databases?.[0]?.name;
    if (!isLoading && !database && defaultDatabase) {
      setDatabase(defaultDatabase);
    }
  }, [isLoading, database, databases]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Branches"
      throttle
      searchBarAccessory={
        <DatabaseDropdown
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
          icon={{
            source: "branch.svg",
            tintColor: Color.SecondaryText,
          }}
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
                  icon: getAvatarIcon(branch.actor.display_name),
                }
              : {},
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={branch.html_url} />
                {/*<Action.Push title="New Branch" target={} shortcut={Shortcut.Common.New} />*/}
                {database && organization && branch && !branch.production ? (
                  <Action.Push
                    icon={{
                      source: "pull-request.svg",
                      tintColor: Color.PrimaryText,
                    }}
                    title="Create Deploy Request"
                    target={
                      <CreateDeployRequest database={database} organization={organization} branch={branch.name} />
                    }
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
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
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
