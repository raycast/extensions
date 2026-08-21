import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, closeMainWindow, open } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { AdHocProtocol, ConnectOptions, DEFAULT_PORTS, HostSpec, adHocUrl, parseHostSpec } from './connect';

type ConnectForm = {
  host: string;
  protocol: AdHocProtocol;
  port: string;
  username: string;
  observe: boolean;
  guest: boolean;
};

/**
 * Connects straight away when the root search bar supplied a host, and asks for the details
 * otherwise. A host that doesn't parse falls through to the form carrying what was typed, so a typo
 * is corrected rather than retyped.
 */
export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.QuickConnect }>) {
  const typed = args.host?.trim() ?? '';
  const chosen = args.protocol === 'ssh' || args.protocol === 'vnc' ? args.protocol : undefined;
  const spec = parseHostSpec(typed);

  if (spec) {
    return <ImmediateConnect spec={spec} protocol={chosen ?? spec.protocol ?? 'vnc'} />;
  }
  return <QuickConnectForm host={typed} protocol={chosen ?? 'vnc'} />;
}

function ImmediateConnect({ spec, protocol }: { spec: HostSpec; protocol: AdHocProtocol }) {
  useEffect(() => {
    connect(spec.host, protocol, { port: spec.port, username: spec.username });
  }, []);

  return <Detail isLoading markdown={`Connecting to \`${spec.host}\`…`} />;
}

function QuickConnectForm({ host, protocol: initialProtocol }: { host: string; protocol: AdHocProtocol }) {
  const [hostError, setHostError] = useState<string | undefined>();
  const [protocol, setProtocol] = useState<AdHocProtocol>(initialProtocol);

  async function submit(values: ConnectForm) {
    if (!values.host.trim()) {
      setHostError('Required');
      return;
    }

    await connect(values.host.trim(), values.protocol, values);
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
        defaultValue={host}
        error={hostError}
        onChange={() => setHostError(undefined)}
      />
      <Form.Dropdown
        id="protocol"
        title="Protocol"
        value={protocol}
        onChange={(value) => setProtocol(value as AdHocProtocol)}
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

async function connect(
  host: string,
  protocol: AdHocProtocol,
  options: ConnectOptions & { port?: string; username?: string },
) {
  try {
    await open(adHocUrl(host, protocol, options));
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: `Could not connect to ${host}` });
  }
}
