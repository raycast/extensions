import { ThermalTrigger } from "macos-fan-control-client";

// The trigger state is user-visible in four places (form, status markdown, status
// metadata, menu bar), so its wording lives here instead of being rewritten in each.
export const triggerLabel = (trigger: ThermalTrigger) =>
  trigger.state === "holding"
    ? `Holding ${Math.round(trigger.percent)}%`
    : `Armed at ${Math.round(trigger.on)} °C`;

export const triggerDetail = (trigger: ThermalTrigger) =>
  `${Math.round(trigger.on)} °C → ${Math.round(trigger.percent)}% → below ${Math.round(trigger.below)} °C`;

export const speedLabel = (percent: number) =>
  percent === 100 ? "Maximum" : `${percent}%`;
