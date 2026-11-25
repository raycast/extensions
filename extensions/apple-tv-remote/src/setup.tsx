import { Action, ActionPanel, Form, Icon, List, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import {
  AppleTVDevice,
  finishCompanionPairing,
  scan,
  serializeCredentials,
  startCompanionPairing,
} from "@bharper/atv-js";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { savePairing } from "./lib/pairing";

// tvOS 26 and later can finish the handshake without drawing the PIN (pyatv
// #2837), and each failed attempt makes the device wait longer until it restarts.
const PAIRING_HELP =
  "No PIN on the TV? tvOS 26 and later sometimes skip drawing it. Restart the Apple TV, then pair again.\n\nEach wrong PIN makes the Apple TV wait longer before the next attempt, up to 64 seconds, until it restarts.\n\nStart with the Apple TV awake on the home screen, and check that Settings > AirPlay and HomeKit > Allow Access is not restricted.";

/**
 * Pairing flow: scan → pick a device → a 4-digit PIN appears on the TV →
 * enter it → credentials stored. The PIN comes from the Apple TV, so pairing
 * is interactive by nature and can't be a preference.
 */
export default function Setup() {
  const { data: devices = [], isLoading } = usePromise(() => scan(5000, true), [], {
    failureToastOptions: { title: "Scan Failed" },
  });
  const addByIp = <Action.Push title="Add by IP Address" icon={Icon.Plus} target={<ManualEntryForm />} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Apple TVs…">
      <List.EmptyView
        icon={Icon.Monitor}
        title={isLoading ? "Scanning Your Network…" : "No Apple TVs Found"}
        description={
          isLoading
            ? "Looking for Apple TVs via Bonjour."
            : "Make sure your Apple TV is awake and on the same network, or add it by IP address."
        }
        actions={<ActionPanel>{addByIp}</ActionPanel>}
      />
      <List.Section title="Apple TVs on Your Network">
        {devices.map((device) => (
          <List.Item
            key={device.identifier}
            icon={Icon.Monitor}
            title={device.name}
            subtitle={device.address}
            accessories={[{ text: device.model }]}
            actions={
              <ActionPanel>
                <Action.Push title="Pair" icon={Icon.Link} target={<PairForm device={device} />} />
                {addByIp}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

/** For networks where Bonjour discovery is blocked (VPNs, segmented Wi-Fi). */
function ManualEntryForm() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ address: string; name: string; port: string }>({
    onSubmit({ address, name, port }) {
      const device: AppleTVDevice = {
        name: name.trim() || "Apple TV",
        address: address.trim(),
        port: Number(port.trim() || 49152),
        airplayPort: 7000,
        identifier: `manual-${address.trim()}`,
        model: "unknown",
        properties: {},
      };
      push(<PairForm device={device} />);
    },
    validation: {
      address: FormValidation.Required,
      port: (value) => {
        const port = Number(value?.trim() || 49152);
        return Number.isInteger(port) && port > 0 && port < 65536 ? undefined : "Enter a port from 1 to 65535.";
      },
    },
  });

  return (
    <Form
      navigationTitle="Add Apple TV by IP"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue to Pairing" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Use this if network discovery is blocked (VPNs, segmented Wi-Fi). Find the address on the Apple TV under Settings > Network." />
      <Form.TextField title="IP Address" placeholder="192.168.1.42" {...itemProps.address} />
      <Form.TextField title="Name" placeholder="Living Room" {...itemProps.name} />
      <Form.TextField
        title="Companion Port"
        placeholder="49152"
        info="The Apple TV picks its Companion port and can change it after a restart. The scan finds it automatically; a manual entry only keeps working while the port stays the same."
        {...itemProps.port}
      />
    </Form>
  );
}

function PairForm({ device }: { device: AppleTVDevice }) {
  const {
    data: session,
    error,
    isLoading,
  } = usePromise(startCompanionPairing, [device], {
    failureToastOptions: { title: "Couldn't Start Pairing" },
  });
  const { handleSubmit, itemProps } = useForm<{ pin: string }>({
    async onSubmit({ pin }) {
      if (!session) return;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Pairing…" });
      try {
        const credentials = await finishCompanionPairing(session, pin.trim(), "Raycast");
        await savePairing(device, { companion: serializeCredentials(credentials), airplay: "" });
        toast.style = Toast.Style.Success;
        toast.title = `Paired with ${device.name}`;
        toast.message = "Try the Apple TV Remote command.";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Pairing Failed";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      pin: (value) => (/^\d{4}$/.test(value?.trim() ?? "") ? undefined : "PIN must be exactly 4 digits."),
    },
  });

  return (
    <Form
      navigationTitle={`Pair with ${device.name}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pair" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          session
            ? `Enter the 4-digit PIN showing on “${device.name}”.`
            : isLoading
              ? `Asking “${device.name}” to show a PIN…`
              : `Could not start pairing with “${device.name}”: ${error?.message}`
        }
      />
      {session && <Form.TextField title="PIN" placeholder="1234" autoFocus {...itemProps.pin} />}
      <Form.Description title="Trouble?" text={PAIRING_HELP} />
    </Form>
  );
}
