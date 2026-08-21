import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, closeMainWindow, open } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { AdHocProtocol, ConnectOptions, DEFAULT_PORTS, HostSpec, adHocUrl, parseHostSpec } from "./connect";
import { optionalPort, requiredText } from "./components/validation";

/** `protocol` is a string because that is what a dropdown reports. {@link adHocProtocol} narrows it. */
type ConnectForm = {
  host: string;
  protocol: string;
  port: string;
  username: string;
  observe: boolean;
  guest: boolean;
};

function adHocProtocol(value: string): AdHocProtocol {
  return value === "ssh" ? "ssh" : "vnc";
}

/**
 * Connects straight away when the root search bar supplied a host, and asks for the details
 * otherwise. A scheme typed inline wins over the dropdown, and a host that doesn't parse falls
 * through to the form carrying what was typed.
 */
export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.QuickConnect }>) {
  const typed = args.host?.trim() ?? "";
  const chosen = args.protocol === "ssh" || args.protocol === "vnc" ? args.protocol : undefined;
  const spec = parseHostSpec(typed);

  if (spec) {
    return <ImmediateConnect spec={spec} protocol={spec.protocol ?? chosen ?? "vnc"} />;
  }
  return <QuickConnectForm host={typed} protocol={chosen ?? "vnc"} />;
}

function ImmediateConnect({ spec, protocol }: { spec: HostSpec; protocol: AdHocProtocol }) {
  // Opening twice would start two sessions, so the connection survives a remount.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    connect(spec.host, protocol, { port: spec.port, username: spec.username });
  }, [spec, protocol]);

  return <Detail isLoading markdown={`Connecting to \`${spec.host}\`…`} />;
}

function QuickConnectForm({ host, protocol }: { host: string; protocol: AdHocProtocol }) {
  const { handleSubmit, itemProps, values } = useForm<ConnectForm>({
    initialValues: { host, protocol, port: "", username: "", observe: false, guest: false },
    validation: { host: requiredText, port: optionalPort },
    onSubmit: (submitted) => connect(submitted.host.trim(), adHocProtocol(submitted.protocol), submitted),
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Desktop} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Host" placeholder="Host name or IP address" {...itemProps.host} />
      <Form.Dropdown title="Protocol" {...itemProps.protocol}>
        <Form.Dropdown.Item value="vnc" title="VNC" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="ssh" title="SSH" icon={Icon.Terminal} />
      </Form.Dropdown>
      <Form.TextField
        title="Port"
        placeholder={String(DEFAULT_PORTS[adHocProtocol(values.protocol)])}
        {...itemProps.port}
      />
      <Form.TextField title="Username" placeholder="Optional" {...itemProps.username} />
      {values.protocol === "vnc" && (
        <>
          <Form.Separator />
          <Form.Checkbox label="Observe Mode" info="Watch the screen without controlling it." {...itemProps.observe} />
          <Form.Checkbox
            label="Connect as Guest"
            info="Connect without using saved credentials."
            {...itemProps.guest}
          />
        </>
      )}
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
