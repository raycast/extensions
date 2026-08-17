import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { ReactElement, useState } from "react";
import {
  DaemonNotRunningError,
  Fan,
  INSTALL_DAEMON_COMMAND,
  setFanSpeed,
} from "./lib/smctl";

const ALL_FANS = "all";

interface SetFanSpeedFormProps {
  readonly fans: readonly Fan[];
  readonly onDone: () => void;
}

interface FormValues {
  readonly rpm: string;
  readonly fan: string;
}

function validateRPM(rpm: string, fans: readonly Fan[]): string | undefined {
  const value = Number(rpm);
  if (!rpm.trim() || !Number.isInteger(value)) {
    return "Enter a whole number";
  }
  const min = Math.min(...fans.map((fan) => fan.minimumRPM));
  const max = Math.max(...fans.map((fan) => fan.maximumRPM));
  if (value < min || value > max) {
    return `Must be between ${min} and ${max}`;
  }
  return undefined;
}

export function SetFanSpeedForm(props: SetFanSpeedFormProps): ReactElement {
  const { fans, onDone } = props;
  const { pop } = useNavigation();
  const [rpmError, setRpmError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues): Promise<void> {
    const validationError = validateRPM(values.rpm, fans);
    if (validationError) {
      setRpmError(validationError);
      return;
    }
    const rpm = Number(values.rpm);
    const fanIndex = values.fan === ALL_FANS ? undefined : Number(values.fan);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting ${rpm} RPM…`,
    });
    try {
      await setFanSpeed(rpm, fanIndex);
      toast.style = Toast.Style.Success;
      toast.title = `Fans set to ${rpm} RPM`;
      onDone();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set fan speed";
      toast.message = error instanceof Error ? error.message : String(error);
      if (error instanceof DaemonNotRunningError) {
        toast.primaryAction = {
          title: "Copy Install Command",
          onAction: () => Clipboard.copy(INSTALL_DAEMON_COMMAND),
        };
      }
    }
  }

  const rangeHint =
    fans.length > 0
      ? `Supported range: ${Math.min(...fans.map((fan) => fan.minimumRPM))}–${Math.max(...fans.map((fan) => fan.maximumRPM))} RPM`
      : undefined;

  return (
    <Form
      navigationTitle="Set Fan Speed"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Speed" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="rpm"
        title="Target RPM"
        placeholder="e.g. 4000"
        info={rangeHint}
        error={rpmError}
        onChange={() => setRpmError(undefined)}
      />
      <Form.Dropdown id="fan" title="Fan" defaultValue={ALL_FANS}>
        <Form.Dropdown.Item value={ALL_FANS} title="All Fans" />
        {fans.map((fan) => (
          <Form.Dropdown.Item
            key={fan.index}
            value={String(fan.index)}
            title={`Fan ${fan.index + 1}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="Manual control stays active until you switch back to Auto. smctl's thermal safety guard returns fans to macOS control if temperatures get too high." />
    </Form>
  );
}
