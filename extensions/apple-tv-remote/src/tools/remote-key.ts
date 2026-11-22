import { ACTIONS, RemoteActionId, findAction } from "../lib/actions";
import { withConnection } from "../lib/connection";

type Input = {
  /**
   * The remote action to perform. Spelled out rather than derived, because
   * Raycast's tool-schema generator only turns a literal union into an enum
   * for the model. The assertion below fails the build if it drifts from the
   * action registry. Sleep and wake are absent on purpose: they belong to the
   * power tool, which asks for confirmation first.
   */
  key:
    | "up"
    | "down"
    | "left"
    | "right"
    | "select"
    | "menu"
    | "home"
    | "home_hold"
    | "guide"
    | "play_pause"
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "volume_up"
    | "volume_down"
    | "skip_forward"
    | "skip_backward"
    | "context_menu"
    | "app_switcher"
    | "control_center"
    | "screensaver";
};

type Assert<T extends true> = T;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type KeysMatchRegistry = Assert<
  RemoteActionId extends Input["key"] ? (Input["key"] extends RemoteActionId ? true : false) : false
>;

/**
 * Press a single button on the Apple TV remote (navigation, playback, volume).
 * Use play or pause when the user asks for one of them (a repeat changes
 * nothing); play_pause toggles like the physical button. Or perform a remote gesture: context_menu (long-press select), app_switcher,
 * control_center, screensaver, skip_forward/skip_backward.
 */
export default async function (input: Input): Promise<string> {
  // The model can still send a phrase ("pause") or a power action ("off").
  const id = findAction(input.key);
  if (!id || id === "sleep" || id === "wake") throw new Error(`"${input.key}" is not a remote key.`);
  await withConnection(ACTIONS[id].run);
  return `Pressed ${id.replace(/_/g, " ")}`;
}
