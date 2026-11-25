import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  TriggerSensor,
  estimate,
  readStatus,
  rpm,
  setAutomatic,
  thermalTrigger,
} from "macos-fan-control-client";
import {
  TRIGGER_SENSORS,
  sensorLabel,
  speedLabel,
  triggerDetail,
  triggerLabel,
} from "./labels";
import { openCommand } from "./launch";

// The trigger must sit under the core's 95 °C safety ceiling, and above the
// release temperature, so the two dropdowns stay inside those bounds. The low
// speeds ask for confirmation because the SMC honours the forced target even
// when its own thermal demand is higher.
const TRIGGERS = [90, 85, 80, 75, 70, 65, 60];
const RELEASES = [70, 65, 60, 55, 50, 45, 40];
const SPEEDS = [100, 85, 70, 55, 40];
const CONFIRM_BELOW = 50;

// Reading the temperatures walks the whole SMC key index (~0.5 s), so poll on a
// calmer cadence than the fans themselves change.
const REFRESH_INTERVAL_MS = 5000;

export default function Command() {
  // The failure is shown in the form; without this a missing core would toast on
  // every poll tick.
  const { data, isLoading, error, revalidate } = useCachedPromise(
    readStatus,
    [true],
    {
      onError: () => {
        // Shown in the form instead.
      },
    },
  );
  const fans = data?.fans ?? [];
  const active = data?.trigger;

  const [sensor, setSensor] = useState<TriggerSensor>("max");
  const [on, setOn] = useState("80");
  const [percent, setPercent] = useState("100");
  const [below, setBelow] = useState("60");

  // Polling flips `isLoading` on every tick, but only the first read has nothing
  // to show yet.
  const isReading = isLoading && !data;

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  const triggerAt = Number(on);
  const selected = Number(percent);
  const releaseAt = Number(below);

  const current = active
    ? `${triggerLabel(active)} · ${triggerDetail(active)} · ${sensorLabel(active.sensor)}`
    : error
      ? "—"
      : data
        ? "No trigger armed."
        : "Reading…";

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
      isLoading={isReading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Arm Trigger"
            icon={Icon.Temperature}
            onSubmit={submit}
          />
          <Action
            title="Open Fan Status"
            icon={Icon.Gauge}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() =>
              openCommand("fan-status", "Could not open Fan Status")
            }
          />
          {active ? (
            <Action
              title="Cancel Trigger"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={() => stop("Trigger cancelled")}
            />
          ) : (
            <Action
              title="Restore Automatic"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => stop("Fans on automatic")}
            />
          )}
        </ActionPanel>
      }
    >
      {error ? (
        <Form.Description
          title="Fan Control Unavailable"
          text={error.message}
        />
      ) : null}
      <Form.Description title="Current" text={current} />
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
        {TRIGGER_SENSORS.map((option) => (
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
