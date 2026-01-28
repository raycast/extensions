import { List, Icon, useNavigation } from "@raycast/api";
import { useGraphsConfig } from "./utils";
import { QuickCaptureDetail } from "./components";
import { graphList } from "./list";
import { keys } from "./utils";

export default function Command() {
  const { graphsConfig } = useGraphsConfig();
  const { push } = useNavigation();
  if (keys(graphsConfig).length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }
  if (keys(graphsConfig).length === 1) {
    const graphConfig = graphsConfig[keys(graphsConfig)[0]];
    return <QuickCaptureDetail graphConfig={graphConfig} />;
  }

  return (
    <List>
      {graphList(graphsConfig, {
        onAction: (graphConfig) => {
          push(<QuickCaptureDetail graphConfig={graphConfig} />);
        },
        title: "Capture to graph",
      })}
    </List>
  );
}
