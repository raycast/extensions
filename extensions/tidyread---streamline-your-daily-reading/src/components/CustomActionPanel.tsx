import { ActionPanel } from "@raycast/api";
import CommonActions from "./CommonActions";

type CustomActionPanelProps = React.ComponentProps<typeof ActionPanel>;

function CustomCustomActionPanel(props: CustomActionPanelProps) {
  return (
    <ActionPanel>
      {props.children}
      <CommonActions />
    </ActionPanel>
  );
}

export default CustomCustomActionPanel;
