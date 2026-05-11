import { Action, Icon, confirmAlert, showToast } from "@raycast/api";
import Alerts from "../feedback/Alerts";
import Toasts from "../feedback/Toasts";
import { useNamedPorts } from "../hooks/useNamedPorts";

export function DeleteNamedPortAction(props: { port: number }) {
  const { getNamedPort, deleteNamedPort } = useNamedPorts();

  return (
    <Action
      title="Delete"
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        const namedPortInfo = getNamedPort(props.port);
        if (await confirmAlert(Alerts.DeleteNamedPort(namedPortInfo?.name ?? props.port.toString()))) {
          deleteNamedPort(props.port);
          showToast(Toasts.DeleteNamedPort.Success(namedPortInfo?.name ?? props.port.toString()));
        }
      }}
    />
  );
}
