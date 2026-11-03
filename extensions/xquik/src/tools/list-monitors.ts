import { fetchMonitorPage, MonitorKind, monitorTarget } from "../lib/monitors";

type Input = {
  /**
   * Either account for X account monitors or keyword for search query monitors.
   */
  kind: MonitorKind;
  /**
   * The nextCursor value of the previous call, to read the next 20 monitors.
   */
  cursor?: string;
};

/**
 * List your Xquik monitors of 1 kind. Returns up to 20 monitors and a nextCursor when more exist.
 */
export default async function tool({ kind, cursor }: Input) {
  const { monitors, nextCursor } = await fetchMonitorPage(kind, cursor);
  return {
    monitors: monitors.map((monitor) => ({
      id: monitor.id,
      target: monitorTarget(monitor),
      name: monitor.name,
      isActive: monitor.isActive,
      eventTypes: monitor.eventTypes,
    })),
    nextCursor,
  };
}
