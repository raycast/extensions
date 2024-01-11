import { Action, ActionPanel, Image, Keyboard, List } from "@raycast/api";
import { format } from "date-fns";
import { useDeployRequests, useSelectedDatabase, useSelectedOrganization } from "./utils/hooks";
import { View, ListDatabaseDropdown } from "./utils/components";
import { PlanetScaleColor } from "./utils/colors";

function SearchDeployRequests() {
  const [organization, setOrganization] = useSelectedOrganization();
  const [database, setDatabase] = useSelectedDatabase();
  const { deployRequests, deployRequestsLoading } = useDeployRequests({ organization, database });

  return (
    <List
      isLoading={deployRequestsLoading}
      searchBarPlaceholder="Search deploy requests"
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
                  source: "deploy-open.svg",
                  tintColor: PlanetScaleColor.Green,
                  tooltip: "Open",
                },
                closed: {
                  source: "deploy-closed.svg",
                  tintColor: PlanetScaleColor.Red,
                  tooltip: "Closed",
                },
                deployed: {
                  source: "deploy-deployed.svg",
                  tintColor: PlanetScaleColor.Purple,
                  tooltip: "Deployed",
                },
              }[deployRequest.deployment_state === "complete" ? "deployed" : deployRequest.state]
            }
            accessories={[
              deployRequest.approved
                ? {
                    tag: {
                      value: "Approved",
                      color: PlanetScaleColor.Green,
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
                    icon: {
                      source: deployRequest.actor.avatar_url,
                      mask: Image.Mask.Circle,
                    },
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
export default function Command() {
  return (
    <View>
      <SearchDeployRequests />
    </View>
  );
}
