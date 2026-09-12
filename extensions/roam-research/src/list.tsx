import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useGraphsConfig, crossPlatformShortcut } from "./utils";
import { GraphDetail } from "./detail";
import { recheckGraphCapabilities, clearGraphPagesCache } from "./roamApi";

function capabilityAccessory(capabilities: GraphConfig["capabilities"]): { tag: { value: string; color: Color } } {
  // Default: undefined capabilities = full access (consistent with capabilities?.read !== false pattern)
  if (!capabilities) return { tag: { value: "Full Access", color: Color.Green } };
  const { read, append, edit } = capabilities;
  if (read && append && edit) return { tag: { value: "Full Access", color: Color.Green } };
  if (read && append) return { tag: { value: "Read + Append", color: Color.Green } };
  if (read) return { tag: { value: "Read Only", color: Color.Blue } };
  if (append) return { tag: { value: "Append Only", color: Color.Orange } };
  return { tag: { value: "No Access", color: Color.Red } };
}

interface GraphListOptions {
  onAction: (graphConfig: GraphConfig) => void;
  title?: string;
  removeGraph?: (graphName: string) => void;
  saveGraphConfig?: (obj: GraphConfig) => void;
  moveGraph?: (graphName: string, direction: "up" | "down") => void;
  orderedGraphNames: string[];
}

export const graphList = (graphsConfig: GraphsConfigMap, options: GraphListOptions) => {
  const { onAction, title, removeGraph, saveGraphConfig, moveGraph, orderedGraphNames } = options;
  if (orderedGraphNames.length === 0) {
    return <List.EmptyView icon={Icon.Tray} title="Please add graph first" />;
  }
  return orderedGraphNames
    .filter((name) => graphsConfig[name])
    .map((graphName, idx) => {
      return (
        <List.Item
          title={graphName}
          key={graphName}
          icon={Icon.MagnifyingGlass}
          accessories={[capabilityAccessory(graphsConfig[graphName].capabilities)]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.MagnifyingGlass}
                title={title ?? "Detail"}
                onAction={() => {
                  onAction(graphsConfig[graphName]);
                }}
              />
              {moveGraph && idx > 0 && (
                <Action
                  icon={Icon.ArrowUp}
                  title="Move Up"
                  shortcut={crossPlatformShortcut(["cmd", "shift"], "arrowUp")}
                  onAction={() => moveGraph(graphName, "up")}
                />
              )}
              {moveGraph && idx < orderedGraphNames.length - 1 && (
                <Action
                  icon={Icon.ArrowDown}
                  title="Move Down"
                  shortcut={crossPlatformShortcut(["cmd", "shift"], "arrowDown")}
                  onAction={() => moveGraph(graphName, "down")}
                />
              )}
              {saveGraphConfig && (
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Recheck Permissions & Refresh Caches"
                  onAction={async () => {
                    const graphConfig = graphsConfig[graphName];
                    const toast = await showToast({ title: "Rechecking permissions...", style: Toast.Style.Animated });
                    try {
                      const capabilities = await recheckGraphCapabilities(graphConfig, saveGraphConfig);
                      clearGraphPagesCache(graphConfig.nameField);

                      toast.style = Toast.Style.Success;
                      if (capabilities.read && capabilities.append) {
                        toast.title = `"${graphName}" — full access — caches refreshed`;
                      } else if (capabilities.read) {
                        toast.title = `"${graphName}" — read only — caches refreshed`;
                      } else if (capabilities.append) {
                        toast.title = `"${graphName}" — append only — caches refreshed`;
                      } else {
                        toast.style = Toast.Style.Failure;
                        toast.title = `"${graphName}" — no access detected`;
                        toast.message = "Check that the token is still valid.";
                      }
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Recheck failed";
                      toast.message = String(error);
                    }
                  }}
                />
              )}
              {/* removeGraph is optional and we only show the "Remove Graph" as a possible option when it is passed */}
              {removeGraph && (
                <Action
                  icon={Icon.Trash}
                  title={"Remove Graph"}
                  onAction={async () => {
                    await confirmAlert({
                      title: "Remove this graph from Raycast?",
                      primaryAction: {
                        title: "Delete",
                        onAction() {
                          removeGraph(graphName);
                        },
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      );
    });
};

export default function Command() {
  const { graphsConfig, saveGraphConfig, orderedGraphNames, moveGraph } = useGraphsConfig();
  const { push } = useNavigation();
  return (
    <List>
      {graphList(graphsConfig, {
        onAction: (graphConfig) => {
          push(<GraphDetail graphConfig={graphConfig} />);
        },
        saveGraphConfig,
        orderedGraphNames,
        moveGraph,
      })}
    </List>
  );
}
