import { ActionPanel, Action, Icon, List, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { useGraphsConfig } from "./utils";
import { GraphDetail } from "./detail";
import { keys } from "./utils";

interface OnActionProps {
  onAction: (graphConfig: GraphConfig) => void;
  title?: string;
}

export const graphList = (
  graphsConfig: GraphsConfigMap,
  onActionProps: OnActionProps,
  removeGraphFunction?: (graphName: string) => void
) => {
  if (keys(graphsConfig).length === 0) {
    return <List.EmptyView icon={Icon.Tray} title="Please add graph first" />;
  }
  return keys(graphsConfig).map((graphName) => {
    return (
      <List.Item
        title={graphName}
        key={graphName}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.MagnifyingGlass}
              title={onActionProps.title ?? "Detail"}
              onAction={() => {
                onActionProps.onAction(graphsConfig[graphName]);
              }}
            />
            {/* removeGraphFunction is optional and we only show the "Remove Graph" as a possible option when it is passed */}
            {removeGraphFunction && (
              <Action
                icon={Icon.Trash}
                title={"Remove Graph"}
                onAction={async () => {
                  await confirmAlert({
                    title: "Remove this graph from Raycast?",
                    primaryAction: {
                      title: "Delete",
                      onAction() {
                        removeGraphFunction(graphName);
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
  const { graphsConfig } = useGraphsConfig();
  const { push } = useNavigation();
  return (
    <List>
      {graphList(graphsConfig, {
        onAction: (graphConfig) => {
          push(<GraphDetail graphConfig={graphConfig} />);
        },
      })}
    </List>
  );
}
