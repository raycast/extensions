import { Action, Icon, showToast, useNavigation } from "@raycast/api";
import { NamedPortForm } from "../components/named-port-form";
import Toasts from "../feedback/Toasts";
import { useNamedPorts } from "../hooks/useNamedPorts";

export function EditNamedPortAction(props: { port: number }) {
  const { updateNamedPort, getNamedPort } = useNamedPorts();
  const { push, pop } = useNavigation();
  return (
    <Action
      title="Edit"
      icon={Icon.Pencil}
      onAction={() => {
        const namedPortInfo = getNamedPort(props.port);

        if (namedPortInfo === undefined) {
          showToast(Toasts.EditNamedPort.NotFound(props.port));
        } else {
          push(
            <NamedPortForm
              initialValues={{ name: namedPortInfo.name, port: props.port.toString() }}
              onSubmit={(v) => {
                updateNamedPort(parseInt(v.port), { name: v.name });
                showToast(Toasts.EditNamedPort.Success(v.name));
                pop();
              }}
            />
          );
        }
      }}
    />
  );
}
