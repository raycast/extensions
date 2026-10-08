import { ActionPanel, Alert, Action, confirmAlert, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { SingleGraphSearchView, QuickCaptureFromGraph } from "./components";
import { TemplateListView } from "./manage-templates";
import { GraphOnboardingDetail } from "./new-graph";
import { recheckGraphCapabilities, clearGraphPagesCache } from "./roamApi";
import { useGraphsConfig } from "./utils";
import { RandomBlockFromList } from "./random";

export const GraphDetail = ({ graphConfig }: { graphConfig: GraphConfig }) => {
  const { removeGraphConfig, saveGraphConfig } = useGraphsConfig();
  const { push, pop } = useNavigation();
  const canRead = graphConfig.capabilities?.read !== false;
  const canAppend = graphConfig.capabilities?.append !== false;
  return (
    <List>
      <List.Item
        title="Getting Started"
        icon={Icon.Book}
        actions={
          <ActionPanel>
            <Action.Push
              title="Getting Started"
              icon={Icon.Book}
              target={
                <GraphOnboardingDetail
                  graphName={graphConfig.nameField}
                  capabilities={graphConfig.capabilities || { read: true, append: true, edit: true }}
                />
              }
            />
          </ActionPanel>
        }
      />
      <List.Section title="Commands">
        {canRead && (
          <List.Item
            title="Search"
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="Search"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    push(<SingleGraphSearchView graphConfig={graphConfig} />);
                  }}
                />
              </ActionPanel>
            }
          />
        )}
        {canAppend && (
          <List.Item
            title="Quick Capture"
            icon={Icon.Pencil}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Quick Capture"
                  icon={Icon.Pencil}
                  target={<QuickCaptureFromGraph graphConfig={graphConfig} />}
                />
              </ActionPanel>
            }
          />
        )}
        {canRead && (
          <List.Item
            title="Random Block"
            icon={Icon.Shuffle}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Random Block"
                  icon={Icon.Shuffle}
                  target={<RandomBlockFromList graphConfig={graphConfig} />}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Settings">
        <List.Item
          title="Manage Capture Templates"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.Push title="Manage Templates" icon={Icon.Document} target={<TemplateListView />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Recheck Permissions & Refresh Caches"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Recheck Permissions & Refresh Caches"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  const toast = await showToast({ title: "Rechecking permissions...", style: Toast.Style.Animated });
                  try {
                    const capabilities = await recheckGraphCapabilities(graphConfig, saveGraphConfig);
                    clearGraphPagesCache(graphConfig.nameField);

                    if (capabilities.read && capabilities.append) {
                      toast.style = Toast.Style.Success;
                      toast.title = "Full access confirmed — caches refreshed";
                      pop();
                    } else if (capabilities.read) {
                      toast.style = Toast.Style.Success;
                      toast.title = "Read-only access confirmed — caches refreshed";
                      pop();
                    } else if (capabilities.append) {
                      toast.style = Toast.Style.Success;
                      toast.title = "Append-only access confirmed — caches refreshed";
                      pop();
                    } else {
                      toast.style = Toast.Style.Failure;
                      toast.title = "No access detected";
                      toast.message = "Check that the token is still valid.";
                    }
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Recheck failed";
                    toast.message = String(error);
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Remove Graph"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title="Remove Graph"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await confirmAlert({
                    title: "Remove this graph from Raycast?",
                    primaryAction: {
                      title: "Remove",
                      style: Alert.ActionStyle.Destructive,
                      onAction() {
                        removeGraphConfig(graphConfig.nameField);
                        pop();
                      },
                    },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
};
