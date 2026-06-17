import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { format } from "date-fns";
import { PlanetScaleColor } from "./lib/colors";
import { View } from "./lib/oauth/view";
import { ListDatabaseDropdown } from "./lib/components/list-database-dropdown";
import { useDeployRequests } from "./lib/hooks/use-deploy-requests";
import { useSelectedOrganization } from "./lib/hooks/use-selected-organization";
import { useSelectedDatabase } from "./lib/hooks/use-selected-database";
import { CreateDeployRequest } from "./create-deploy-request";
import { getDeployRequestIcon, getUserIcon } from "./lib/icons";
import { useCachedState } from "@raycast/utils";
import { DeployRequestDetail } from "./lib/components/deploy-request-detail";

function SearchDeployRequests() {
  const [organization, setOrganization] = useSelectedOrganization();
  const [database, setDatabase] = useSelectedDatabase();
  const [showDeployRequestDetail, setShowDeployRequestDetail] = useCachedState("show-deploy-request-detail", true);
  const {
    deployRequests,
    revertChanges,
    skipRevertPeriod,
    deployChanges,
    closeDeployRequest,
    deployRequestsLoading,
    refreshDeployRequests,
  } = useDeployRequests({
    organization,
    database,
  });

  return (
    <List
      isLoading={deployRequestsLoading}
      searchBarPlaceholder="Search deploy requests"
      isShowingDetail={showDeployRequestDetail}
      searchBarAccessory={
        <ListDatabaseDropdown
          onChange={(value) => {
            setOrganization(value.organization);
            setDatabase(value.database);
          }}
        />
      }
    >
      {deployRequests.map((deployRequest) => (
        <List.Item
          key={deployRequest.id}
          title={`#${deployRequest.number}`}
          keywords={[deployRequest.notes, deployRequest.branch, deployRequest.into_branch]}
          subtitle={showDeployRequestDetail ? "" : deployRequest.notes}
          icon={getDeployRequestIcon(deployRequest)}
          detail={
            showDeployRequestDetail && database && organization ? (
              <DeployRequestDetail database={database} organization={organization} deployRequest={deployRequest} />
            ) : undefined
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
            ...(showDeployRequestDetail
              ? []
              : [
                  {
                    tooltip: `Updated: ${format(new Date(deployRequest.updated_at), "EEEE d MMMM yyyy 'at' HH:mm")}`,
                    date: new Date(deployRequest.updated_at),
                  },
                  deployRequest.actor
                    ? {
                        tooltip: deployRequest.actor.display_name,
                        icon: getUserIcon(deployRequest.actor),
                      }
                    : {},
                ]),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={deployRequest.html_url} />
                <Action
                  title={showDeployRequestDetail ? "Hide Detail" : "Show Detail"}
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowDeployRequestDetail(!showDeployRequestDetail)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {deployRequest.state === "open" && deployRequest.deployment_state === "ready" ? (
                  <>
                    <Action
                      title="Deploy Changes"
                      icon={{
                        source: "deploy-deployed.svg",
                        tintColor: PlanetScaleColor.Purple,
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          primaryAction: {
                            title: "Confirm",
                            style: Alert.ActionStyle.Default,
                          },
                          icon: {
                            source: "deploy-deployed.svg",
                            tintColor: PlanetScaleColor.Purple,
                          },
                          title: "Deploy Changes",
                          message: `Are you sure you want to deploy the changes of the request #${deployRequest.number} (${deployRequest.branch} -> ${deployRequest.into_branch})?`,
                        });
                        if (confirmed) {
                          await deployChanges(deployRequest.id);
                        }
                      }}
                    />
                    <Action
                      title="Close Deploy Request"
                      icon={{
                        source: "deploy-closed.svg",
                        tintColor: PlanetScaleColor.Red,
                      }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
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
                          title: "Close Deploy Request",
                          message: `Are you sure you want to close the deploy request #${deployRequest.number} (${deployRequest.branch} -> ${deployRequest.into_branch})?`,
                        });
                        if (confirmed) {
                          await closeDeployRequest(deployRequest.id);
                        }
                      }}
                    />
                  </>
                ) : null}
                {deployRequest.state === "open" && deployRequest.deployment_state === "complete_pending_revert" ? (
                  <>
                    <Action
                      title="Skip Revert Period"
                      icon={{
                        source: "deploy-deployed.svg",
                        tintColor: PlanetScaleColor.Purple,
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          primaryAction: {
                            title: "Confirm",
                            style: Alert.ActionStyle.Default,
                          },
                          icon: {
                            source: "deploy-deployed.svg",
                            tintColor: PlanetScaleColor.Purple,
                          },
                          title: "Deploy Changes",
                          message: `Are you sure you want to skip the revert period of the request #${deployRequest.number} (${deployRequest.branch} -> ${deployRequest.into_branch})?`,
                        });
                        if (confirmed) {
                          await skipRevertPeriod(deployRequest.id);
                        }
                      }}
                    />
                    <Action
                      title="Revert Changes"
                      icon={{
                        source: "deploy-closed.svg",
                        tintColor: PlanetScaleColor.Red,
                      }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
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
                          title: "Revert Changes",
                          message: `Are you sure you want to revert the changes made by #${deployRequest.number} (${deployRequest.branch} -> ${deployRequest.into_branch})?`,
                        });
                        if (confirmed) {
                          await revertChanges(deployRequest.id);
                        }
                      }}
                    />
                  </>
                ) : null}
                {database && organization ? (
                  <Action.Push
                    icon={{
                      source: "deploy-create.svg",
                      tintColor: Color.PrimaryText,
                    }}
                    title="Create Deploy Request"
                    target={<CreateDeployRequest organization={organization} database={database} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                ) : null}
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
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  icon={Icon.ArrowClockwise}
                  onAction={refreshDeployRequests}
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
      <SearchDeployRequests />
    </View>
  );
}
