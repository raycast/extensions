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
      <Form.TextField title="Name" placeholder="Alias name of tunnel" {...itemProps.name} />
      <Form.TextField title="Local Port" placeholder="Enter a port" {...itemProps.localPort} />
      <Form.TextField title="Username" placeholder="Enter username" {...itemProps.user} />
      <Form.TextField title="SSH Host" placeholder="Enter ssh host" {...itemProps.sshHost} />
      <Form.TextField title="SSH Port" placeholder="Enter ssh port (default: 22)" {...itemProps.sshPort} />
      <Form.TextField
        title="Target Host"
        placeholder="Enter target host (default: localhost)"
        {...itemProps.remoteHost}
      />
      <Form.TextField title="Target Port" placeholder="Enter target port" {...itemProps.remotePort} />
      <Form.Separator />
      <Form.Dropdown id="type" title="Tunnel Type">
        <Form.Dropdown.Item value={TunnelType.Local} title="Local" />
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
