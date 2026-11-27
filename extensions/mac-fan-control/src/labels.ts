import { ThermalTrigger, TriggerSensor } from "macos-fan-control-client";

// The trigger state is user-visible in four places (form, status markdown, status
// metadata, menu bar), so its wording lives here instead of being rewritten in each.
export const TRIGGER_SENSORS: { value: TriggerSensor; label: string }[] = [
  { value: "max", label: "Hottest die (CPU or GPU)" },
  { value: "cpu", label: "CPU" },
  { value: "gpu", label: "GPU" },
];

export const sensorLabel = (sensor: TriggerSensor) =>
  TRIGGER_SENSORS.find((option) => option.value === sensor)?.label ??
  TRIGGER_SENSORS[0].label;

export const triggerLabel = (trigger: ThermalTrigger) =>
  trigger.state === "holding"
    ? `Holding ${Math.round(trigger.percent)}%`
    : `Armed at ${Math.round(trigger.on)} °C`;

export const triggerDetail = (trigger: ThermalTrigger) =>
  `${Math.round(trigger.on)} °C → ${Math.round(trigger.percent)}% → below ${Math.round(trigger.below)} °C`;

export const speedLabel = (percent: number) =>
  percent === 100 ? "Maximum" : `${percent}%`;
