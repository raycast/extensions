import { Action, ActionPanel, Color, Keyboard, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { format } from "date-fns";
import { useDeployRequests, useSelectedDatabase, useSelectedOrganization } from "./utils/hooks";
import { DatabaseDropdown } from "./utils/components";

export default function SearchDeployRequests() {
  const [organization, setOrganization] = useSelectedOrganization();
  const [database, setDatabase] = useSelectedDatabase();
  const { deployRequests, deployRequestsLoading } = useDeployRequests({ organization, database });

  return (
    <List
      isLoading={deployRequestsLoading}
      searchBarPlaceholder="Search deploy requests"
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
      {deployRequests?.map((deployRequest) => {
        return (
          <List.Item
            key={deployRequest.id}
            title={`#${deployRequest.number}`}
            keywords={[deployRequest.notes]}
            subtitle={deployRequest.notes}
            icon={
              {
                open: {
                  source: "pull-request.svg",
                  tintColor: Color.Green,
                },
                closed: {
                  source: "pull-request.svg",
                  tintColor: Color.Red,
                },
                deployed: {
                  source: "merge.svg",
                  tintColor: Color.Purple,
                },
              }[deployRequest.deployed_at ? "deployed" : deployRequest.state]
            }
            accessories={[
              deployRequest.approved
                ? {
                    tag: {
                      value: "Approved",
                      color: Color.Green,
                    },
                  }
                : {},
              {
                text: `${deployRequest.branch} -> ${deployRequest.into_branch}`,
              },
              {
                tooltip: `Updated: ${format(new Date(deployRequest.updated_at), "EEEE d MMMM yyyy 'at' HH:mm")}`,
                date: new Date(deployRequest.updated_at),
              },
              deployRequest.actor
                ? {
                    tooltip: deployRequest.actor.display_name,
                    icon: getAvatarIcon(deployRequest.actor.display_name),
                  }
                : {},
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={deployRequest.html_url} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Origin Branch"
                    content={deployRequest.branch}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  <Action.CopyToClipboard
                    title="Copy Deploy Branch"
                    content={deployRequest.branch}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={deployRequest.html_url}
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
