import { ActionPanel } from "@raycast/api";
import CommonActions from "./CommonActions";

type CustomActionPanelProps = React.ComponentProps<typeof ActionPanel>;

function CustomActionPanel(props: CustomActionPanelProps) {
  return (
    <ActionPanel>
      {props.children}
      <CommonActions />
    </ActionPanel>
  );
}

export default CustomActionPanel;
