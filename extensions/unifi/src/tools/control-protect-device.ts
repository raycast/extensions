import { Action, Tool } from "@raycast/api";
import { UniFiClient } from "../api/client";

type ProtectAction =
  | "play-siren"
  | "stop-siren"
  | "test-siren"
  | "ptz-goto"
  | "ptz-patrol-start"
  | "ptz-patrol-stop"
  | "activate-relay"
  | "trigger-alarm-hub"
  | "arm"
  | "disarm";

type Input = {
  /** Exact supported action. Use read tools first to obtain the correct device ID. */
  action: ProtectAction;
  /** Protect camera, siren, relay, or alarm hub ID. Not required for arm or disarm. */
  deviceId?: string;
  /** Delay in milliseconds before an alarm hub output activates. */
  delay?: number;
  /** Duration in seconds for play-siren, or milliseconds for relay and alarm-hub actions. */
  duration?: number;
  /** Desired relay or alarm hub output state. Omit to toggle when the endpoint supports it. */
  enable?: boolean;
  /** Relay or alarm hub output number, normally 0 or 1. */
  outputId?: number;
  /** PTZ preset slot (-1 or greater), or patrol slot from 0 through 4. */
  slot?: number;
  /** Siren test volume accepted by the device. */
  volume?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  info: [
    { name: "Action", value: input.action },
    { name: "Device", value: input.deviceId },
    { name: "Delay", value: input.delay === undefined ? undefined : String(input.delay) },
    { name: "Output", value: input.outputId === undefined ? undefined : String(input.outputId) },
    { name: "Slot", value: input.slot === undefined ? undefined : String(input.slot) },
    { name: "Duration", value: input.duration === undefined ? undefined : String(input.duration) },
  ],
  message: "Run this action on the physical UniFi Protect system?",
  style: ["stop-siren", "ptz-patrol-stop", "disarm"].includes(input.action)
    ? Action.Style.Regular
    : Action.Style.Destructive,
});

/** Run a supported physical UniFi Protect action. */
export default async function controlProtectDevice(input: Input) {
  await UniFiClient.fromPreferences().controlProtect(input);
  return { action: input.action, deviceId: input.deviceId, status: "requested" };
}
