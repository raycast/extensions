import { Action, ActionPanel, Form, Icon, closeMainWindow, open } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { useState } from 'react';
import { adHocUrl } from './connect';

type ConnectForm = {
  host: string;
  protocol: 'vnc' | 'ssh';
  port: string;
  username: string;
  observe: boolean;
  guest: boolean;
};

export default function Command() {
  const [hostError, setHostError] = useState<string | undefined>();

  async function submit(values: ConnectForm) {
    if (!values.host.trim()) {
      setHostError('Required');
      return;
    }

    const url = adHocUrl(values.host, values.protocol, {
      port: values.port,
      username: values.username,
      observe: values.observe,
      guest: values.guest,
    });

    try {
      await open(url);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: `Could not connect to ${values.host.trim()}` });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Desktop} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="host"
        title="Host"
        placeholder="192.168.1.14 or mac-studio.local"
        error={hostError}
        onChange={() => setHostError(undefined)}
      />
      <Form.Dropdown id="protocol" title="Protocol" defaultValue="vnc">
        <Form.Dropdown.Item value="vnc" title="VNC" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="ssh" title="SSH" icon={Icon.Terminal} />
      </Form.Dropdown>
      <Form.TextField id="port" title="Port" placeholder="Default for the protocol" />
      <Form.TextField id="username" title="Username" placeholder="Optional" />
      <Form.Separator />
      <Form.Checkbox id="observe" label="Observe Mode" info="Watch the screen without controlling it." />
      <Form.Checkbox id="guest" label="Connect as Guest" info="Connect without using saved credentials." />
    </Form>
  );
}
