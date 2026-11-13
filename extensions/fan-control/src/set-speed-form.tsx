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
  allowedRange,
  setFanSpeed,
} from "./lib/smctl";

const ALL_FANS = "all";

interface SetFanSpeedFormProps {
  readonly fans: readonly Fan[];
  readonly initialFanIndex?: number;
  readonly onDone: () => void;
}

interface FormValues {
  readonly rpm: string;
  readonly fan: string;
}

function toFanIndex(selection: string): number | undefined {
  return selection === ALL_FANS ? undefined : Number(selection);
}

function validateRPM(
  rpm: string,
  fans: readonly Fan[],
  fanIndex: number | undefined,
): string | undefined {
  const value = Number(rpm);
  if (!rpm.trim() || !Number.isInteger(value)) {
    return "Enter a whole number";
  }
  const range = allowedRange(fans, fanIndex);
  if (range && (value < range.min || value > range.max)) {
    return `Must be between ${range.min} and ${range.max}`;
  }
  return undefined;
}

export function SetFanSpeedForm(props: SetFanSpeedFormProps): ReactElement {
  const { fans, initialFanIndex, onDone } = props;
  const { pop } = useNavigation();
  const [rpmError, setRpmError] = useState<string | undefined>();
  const [selectedFan, setSelectedFan] = useState<string>(
    initialFanIndex === undefined ? ALL_FANS : String(initialFanIndex),
  );

  async function handleSubmit(values: FormValues): Promise<void> {
    const fanIndex = toFanIndex(values.fan);
    const validationError = validateRPM(values.rpm, fans, fanIndex);
    if (validationError) {
      setRpmError(validationError);
      return;
    }
    const rpm = Number(values.rpm);
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

  const range = allowedRange(fans, toFanIndex(selectedFan));
  const rangeHint = range
    ? `Supported range: ${range.min}–${range.max} RPM`
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
      <Form.Dropdown
        id="fan"
        title="Fan"
        value={selectedFan}
        onChange={(newValue) => {
          setSelectedFan(newValue);
          setRpmError(undefined);
        }}
      >
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
