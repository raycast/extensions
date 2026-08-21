import { Action, ActionPanel, Form, Icon, closeMainWindow, open } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { useState } from 'react';
import { DEFAULT_PORTS, adHocUrl } from './connect';

type Protocol = 'vnc' | 'ssh';

type ConnectForm = {
  host: string;
  protocol: Protocol;
  port: string;
  username: string;
  observe: boolean;
  guest: boolean;
};

export default function Command() {
  const [hostError, setHostError] = useState<string | undefined>();
  const [protocol, setProtocol] = useState<Protocol>('vnc');

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
        placeholder="Host name or IP address"
        error={hostError}
        onChange={() => setHostError(undefined)}
      />
      <Form.Dropdown
        id="protocol"
        title="Protocol"
        value={protocol}
        onChange={(value) => setProtocol(value as Protocol)}
      >
        <Form.Dropdown.Item value="vnc" title="VNC" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="ssh" title="SSH" icon={Icon.Terminal} />
      </Form.Dropdown>
      <Form.TextField id="port" title="Port" placeholder={String(DEFAULT_PORTS[protocol])} />
      <Form.TextField id="username" title="Username" placeholder="Optional" />
      <Form.Separator />
      <Form.Checkbox id="observe" label="Observe Mode" info="Watch the screen without controlling it." />
      <Form.Checkbox id="guest" label="Connect as Guest" info="Connect without using saved credentials." />
    </Form>
  );
}
