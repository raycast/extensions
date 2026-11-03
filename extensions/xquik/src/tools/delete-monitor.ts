import { Action, Tool } from "@raycast/api";
import { deleteMonitor, fetchMonitor, MonitorKind, monitorTarget } from "../lib/monitors";

type Input = {
  /**
   * Either account or keyword, from list-monitors.
   */
  kind: MonitorKind;
  /**
   * The monitor ID from list-monitors.
   */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ kind, id }) => {
  const target = monitorTarget(await fetchMonitor(kind, id));
  return {
    style: Action.Style.Destructive,
    message: `Delete the monitor for ${target}?`,
    info: [
      { name: "Target", value: target },
      { name: "Monitor ID", value: id },
    ],
  };
};

/**
 * Delete an Xquik monitor and its stored events. Call list-monitors first to get its kind and ID.
 */
export default async function tool({ kind, id }: Input) {
  const target = monitorTarget(await fetchMonitor(kind, id));
  await deleteMonitor(kind, id);
  return { deleted: true, id, target };
}
