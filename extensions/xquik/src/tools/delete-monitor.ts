import { Action, Tool } from "@raycast/api";
import { deleteMonitor, MonitorKind } from "../lib/monitors";

type Input = {
  /**
   * Either account or keyword, from list-monitors.
   */
  kind: MonitorKind;
  /**
   * The monitor ID from list-monitors.
   */
  id: string;
  /**
   * The monitor's target from list-monitors, shown to the user in the confirmation.
   */
  target: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ target }) => ({
  style: Action.Style.Destructive,
  message: `Delete the monitor for ${target}?`,
  info: [{ name: "Target", value: target }],
});

/**
 * Delete an Xquik monitor and its stored events. Call list-monitors first to get its ID.
 */
export default async function tool({ kind, id, target }: Input) {
  await deleteMonitor(kind, id);
  return { deleted: true, target };
}
