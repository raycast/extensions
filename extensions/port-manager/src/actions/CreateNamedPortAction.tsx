import { Action, Icon, showToast, useNavigation } from "@raycast/api";
import { NamedPortForm } from "../components/named-port-form";
import Toasts from "../feedback/Toasts";
import { NamedPortAlreadyExistsError, useNamedPorts } from "../hooks/useNamedPorts";

export function CreateNamedPortAction() {
  const { createNamedPort } = useNamedPorts();
  const { pop } = useNavigation();

  return (
    <Action.Push
      target={
        <NamedPortForm
          onSubmit={(values) => {
            try {
              createNamedPort(parseInt(values.port), { name: values.name });
              showToast(Toasts.CreateNamedPort.Success(values.name));
              pop();
            } catch (err) {
              if (err instanceof NamedPortAlreadyExistsError) {
                showToast(Toasts.CreateNamedPort.AlreadyExistsError(err));
                return false;
              } else {
                throw err;
              }
            }
          }}
        />
      }
      icon={Icon.Plus}
      title="Create Named Port"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}
