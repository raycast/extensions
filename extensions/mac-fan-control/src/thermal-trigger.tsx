import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Toast,
  confirmAlert,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  TriggerSensor,
  estimate,
  readStatus,
  rpm,
  setAutomatic,
  thermalTrigger,
} from "macos-fan-control-client";
import { speedLabel, triggerDetail, triggerLabel } from "./labels";

// The trigger must sit under the core's 95 °C safety ceiling, and above the
// release temperature, so the two dropdowns stay inside those bounds. The low
// speeds ask for confirmation because the SMC honours the forced target even
// when its own thermal demand is higher.
const SENSORS: { value: TriggerSensor; label: string }[] = [
  { value: "max", label: "Hottest die (CPU or GPU)" },
  { value: "cpu", label: "CPU" },
  { value: "gpu", label: "GPU" },
];
const TRIGGERS = [90, 85, 80, 75, 70, 65, 60];
const RELEASES = [70, 65, 60, 55, 50, 45, 40];
const SPEEDS = [100, 85, 70, 55, 40];
const CONFIRM_BELOW = 50;

const sensorLabel = (sensor: TriggerSensor) =>
  SENSORS.find((option) => option.value === sensor)?.label ?? "Hottest die";

export default function Command() {
  const { data } = useCachedPromise(readStatus, [true]);
  const fans = data?.fans ?? [];
  const active = data?.trigger;

  const [sensor, setSensor] = useState<TriggerSensor>("max");
  const [on, setOn] = useState("80");
  const [percent, setPercent] = useState("100");
  const [below, setBelow] = useState("60");

  const triggerAt = Number(on);
  const selected = Number(percent);
  const releaseAt = Number(below);

  // Keeping the release under the trigger is what makes the band a hysteresis:
  // lowering the trigger below the current release pulls the release down too.
  function changeTrigger(value: string) {
    setOn(value);
    if (Number(below) >= Number(value)) {
      const release = RELEASES.filter(
        (temperature) => temperature < Number(value),
      )[0];
      setBelow(String(release ?? RELEASES[RELEASES.length - 1]));
    }
  }

  async function submit() {
    if (selected < CONFIRM_BELOW) {
      const ok = await confirmAlert({
        title: `Hold ${speedLabel(selected).toLowerCase()}?`,
        message:
          "The SMC will not override a forced target, so this reduces cooling.",
        primaryAction: {
          title: "Arm Trigger",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!ok) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Trigger at ${triggerAt} °C`,
    });
    try {
      await thermalTrigger({
        on: triggerAt,
        below: releaseAt,
        percent: selected,
        sensor,
      });
      await toast.hide();
      await popToRoot();
      await showHUD(
        `Trigger armed: ${triggerAt} °C → ${speedLabel(selected)} → ${releaseAt} °C`,
      );
    } catch (error) {
      await toast.hide();
      showFailureToast(error, { title: "Failed" });
    }
  }

  async function stop(title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await setAutomatic();
      await toast.hide();
      await popToRoot();
      await showHUD(title);
    } catch (error) {
      await toast.hide();
      showFailureToast(error, { title: "Failed" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Arm Trigger"
            icon={Icon.Temperature}
            onSubmit={submit}
          />
          {active ? (
            <Action
              title="Cancel Trigger"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={() => stop("Trigger cancelled")}
            />
          ) : null}
          <Action
            title="Restore Automatic"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => stop("Fans on automatic")}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current"
        text={
          active
            ? `${triggerLabel(active)} · ${triggerDetail(active)} (${sensorLabel(active.sensor)})`
            : "No trigger armed."
        }
      />
      <Form.Description
        title="Right now"
        text={
          data?.temperatures
            ? `CPU ${data.temperatures.cpu.toFixed(1)} °C · GPU ${data.temperatures.gpu.toFixed(1)} °C`
            : "—"
        }
      />
      <Form.Dropdown
        id="sensor"
        title="Sensor"
        info="Which temperature the thresholds track."
        value={sensor}
        onChange={(value) => setSensor(value as TriggerSensor)}
      >
        {SENSORS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.label}
            value={option.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="on"
        title="Trigger at"
        info="When the sensor reaches this temperature the fans spin up."
        value={on}
        onChange={changeTrigger}
      >
        {TRIGGERS.map((temperature) => (
          <Form.Dropdown.Item
            key={temperature}
            title={`${temperature} °C`}
            value={String(temperature)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="percent"
        title="Fan speed"
        info="Speed held from the trigger temperature down to the release temperature."
        value={percent}
        onChange={setPercent}
      >
        {SPEEDS.map((value) => (
          <Form.Dropdown.Item
            key={value}
            title={speedLabel(value)}
            value={String(value)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="below"
        title="Release below"
        info="Once the sensor drops below this temperature the fans go back to firmware."
        value={below}
        onChange={setBelow}
      >
        {RELEASES.filter((temperature) => temperature < triggerAt).map(
          (temperature) => (
            <Form.Dropdown.Item
              key={temperature}
              title={`${temperature} °C`}
              value={String(temperature)}
            />
          ),
        )}
      </Form.Dropdown>
      <Form.Description
        title="Fans at that speed"
        text={
          fans.length
            ? fans.map((fan) => rpm(estimate(fan, selected))).join("  ·  ")
            : "—"
        }
      />
    </Form>
  );
}
