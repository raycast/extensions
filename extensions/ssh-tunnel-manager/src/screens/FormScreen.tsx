import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { MutableRefObject } from "react";
import { initForm } from "../hooks/form";
import { useCache } from "../hooks/store";
import { TunnelType, Values } from "../types";

export function FromScreen(props: { onSubmit: (values: Values) => void; shouldEstablish: MutableRefObject<boolean> }) {
  const { shouldEstablish, onSubmit } = props;
  const { pop } = useNavigation();
  const { cachedList } = useCache();

  const { itemProps, handleSubmit } = initForm(cachedList, (values: Values) => {
    if (!shouldEstablish) return;
    if (shouldEstablish.current) {
      shouldEstablish.current = true;
      onSubmit({ ...values });
    } else {
      shouldEstablish.current = false;
      onSubmit({ ...values });
    }
    pop();
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create And Establish Tunnel" onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Create tunnel"
            onSubmit={(values: Values) => {
              shouldEstablish.current = false;
              return handleSubmit(values);
            }}
          />
          <Action
            title="Tunnel List"
            onAction={pop}
            shortcut={{
              modifiers: ["cmd"],
              key: "n",
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="SSH tunnel config" />
      <Form.TextField title="Name" placeholder="connect.example.com (MariaDB|MongoDB|PosgreSQL)" {...itemProps.name} />
      <Form.TextField title="Local Port" placeholder="Local forwarding port (e.g. 2000)" {...itemProps.localPort} />
      <Form.TextField title="SSH Username" placeholder="Target SSH username (e.g. graffino)" {...itemProps.user} />
      <Form.TextField title="SSH Host" placeholder="Target SSH host (e.g. connect.example.com)" {...itemProps.sshHost} />
      <Form.TextField title="SSH Port" placeholder="Target SSH port (default: 22)" {...itemProps.sshPort} />
      <Form.TextField
        title="Target Host"
        placeholder="Target forwarding host (default: 127.0.0.1)"
        {...itemProps.remoteHost}
      />
      <Form.TextField title="Target forwarding port" placeholder="Enter target port (e.g. 3306|27017|5432" {...itemProps.remotePort} />
      <Form.Separator />
      <Form.Dropdown id="type" title="Tunnel Type">
        <Form.Dropdown.Item value={TunnelType.Local} title="Local (default)" />
        <Form.Dropdown.Item value={TunnelType.Remote} title="Remote" />
      </Form.Dropdown>
      <Form.FilePicker
        title="Identity File"
        allowMultipleSelection={false}
        {...itemProps.identityFile}
      ></Form.FilePicker>
    </Form>
  );
}
