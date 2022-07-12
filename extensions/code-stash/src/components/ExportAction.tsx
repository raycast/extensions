import { Action, Icon } from "@raycast/api";

function ExportAction(props: { onExport: () => void }) {
  return (
    <Action
      icon={Icon.Upload}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "e" }}
      title="Export All"
      onAction={props.onExport}
    />
  );
}

export default ExportAction;
